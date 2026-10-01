-- Phase 3 (n8n integration): webhook outbox, delivery claiming, owner-scoped helpers for the API.
-- The REST API runs with the service role (RLS bypassed), so every function it uses takes the
-- owner explicitly and filters on it.

-- ---------------------------------------------------------------------------
-- Settings: signing secret for outgoing webhooks
-- ---------------------------------------------------------------------------

-- Two random UUIDs give 244 random bits; regenerated from the settings page.
alter table public.settings
  add column webhook_secret text not null
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- ---------------------------------------------------------------------------
-- Duplicate detection usable by the API (service role) and the UI (RLS)
-- ---------------------------------------------------------------------------

create function public.find_duplicates_for_owner(
  p_owner uuid,
  p_email text default null,
  p_website text default null
)
returns table (company_id uuid, company_name text, kundennummer text, grund text)
language sql
stable
set search_path = ''
as $$
  with input as (
    select
      nullif(lower(btrim(p_email)), '') as email,
      nullif(split_part(lower(btrim(p_email)), '@', 2), '') as email_domain,
      public.normalize_domain(p_website) as website_domain
  ),
  matches as (
    select c.company_id, 'email' as grund
    from public.contacts c, input i
    where c.owner_id = p_owner and i.email is not null and lower(c.email) = i.email
    union
    select co.id, 'domain'
    from public.companies co, input i
    where co.owner_id = p_owner
      and co.domain is not null
      and (
        co.domain = i.website_domain
        or (co.domain = i.email_domain and not public.is_freemail_domain(i.email_domain))
      )
  )
  select co.id, co.name, co.kundennummer, string_agg(m.grund, ',' order by m.grund)
  from matches m
  join public.companies co on co.id = m.company_id
  group by co.id, co.name, co.kundennummer
  order by co.name;
$$;

create or replace function public.find_duplicates(p_email text default null, p_website text default null)
returns table (company_id uuid, company_name text, kundennummer text, grund text)
language sql
stable
set search_path = ''
as $$
  select * from public.find_duplicates_for_owner((select auth.uid()), p_email, p_website);
$$;

-- ---------------------------------------------------------------------------
-- Webhook outbox: events are written in the same transaction as the change
-- ---------------------------------------------------------------------------

alter table public.webhook_events add column gesperrt_bis timestamptz;

drop index public.webhook_events_retry_idx;
create index webhook_events_pending_idx
  on public.webhook_events (owner_id, naechster_versuch_am)
  where status = 'ausstehend';
create index webhook_events_owner_created_idx on public.webhook_events (owner_id, created_at desc);

-- Queues an event if a target URL is configured for it in the owner's settings.
create function public.enqueue_webhook(p_owner uuid, p_event text, p_data jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_url text;
  v_id uuid := gen_random_uuid();
begin
  select nullif(btrim(s.webhook_urls ->> p_event), '') into v_url
  from public.settings s
  where s.owner_id = p_owner;

  if v_url is null then
    return;
  end if;

  insert into public.webhook_events (id, owner_id, event, payload, ziel_url)
  values (
    v_id,
    p_owner,
    p_event,
    jsonb_build_object('id', v_id, 'event', p_event, 'occurred_at', now(), 'data', p_data),
    v_url
  );
end;
$$;

-- Payload for deal events: the deal with its stage and company.
create function public.deal_webhook_data(p_deal public.deals)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'deal', to_jsonb(p_deal) - 'owner_id',
    'stage', (select jsonb_build_object('id', s.id, 'name', s.name, 'art', s.art)
              from public.deal_stages s where s.id = p_deal.stage_id),
    'company', (select jsonb_build_object('id', c.id, 'name', c.name, 'kundennummer', c.kundennummer,
                                          'website', c.website)
                from public.companies c where c.id = p_deal.company_id),
    'contact', (select jsonb_build_object('id', k.id, 'vorname', k.vorname, 'nachname', k.nachname,
                                          'email', k.email)
                from public.contacts k where k.id = p_deal.contact_id)
  );
$$;

-- Security definer: users may not call enqueue_webhook directly. The deal row itself has
-- already passed RLS, so new.owner_id is the current user.
create function public.enqueue_deal_webhooks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb := public.deal_webhook_data(new);
  v_art public.deal_stage_art;
begin
  select art into v_art from public.deal_stages where id = new.stage_id;

  if tg_op = 'INSERT' then
    perform public.enqueue_webhook(new.owner_id, 'deal.created', v_data);
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    perform public.enqueue_webhook(
      new.owner_id,
      'deal.stage_changed',
      v_data || jsonb_build_object(
        'previous_stage',
        (select jsonb_build_object('id', s.id, 'name', s.name, 'art', s.art)
         from public.deal_stages s where s.id = old.stage_id)
      )
    );
    if v_art = 'gewonnen' then
      perform public.enqueue_webhook(new.owner_id, 'deal.won', v_data);
    elsif v_art = 'verloren' then
      perform public.enqueue_webhook(new.owner_id, 'deal.lost', v_data);
    end if;
  end if;
  return new;
end;
$$;

create trigger enqueue_deal_webhooks
  after insert or update of stage_id on public.deals
  for each row execute function public.enqueue_deal_webhooks();

-- ---------------------------------------------------------------------------
-- Overdue tasks (called by the daily cron with the service role)
-- ---------------------------------------------------------------------------

alter table public.tasks add column ueberfaellig_gemeldet_am date;

-- Queues task.overdue once per task for tasks due before p_today; returns the count.
create function public.enqueue_overdue_task_webhooks(p_today date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_task record;
  v_count integer := 0;
begin
  for v_task in
    select t.*
    from public.tasks t
    join public.settings s on s.owner_id = t.owner_id
    where not t.erledigt
      and t.faellig_am < p_today
      and t.ueberfaellig_gemeldet_am is null
      and nullif(btrim(s.webhook_urls ->> 'task.overdue'), '') is not null
    for update of t skip locked
  loop
    perform public.enqueue_webhook(
      v_task.owner_id,
      'task.overdue',
      jsonb_build_object(
        'task', to_jsonb(v_task) - 'owner_id',
        'company', (select jsonb_build_object('id', c.id, 'name', c.name, 'kundennummer', c.kundennummer)
                    from public.companies c where c.id = v_task.company_id),
        'deal', (select jsonb_build_object('id', d.id, 'titel', d.titel)
                 from public.deals d where d.id = v_task.deal_id)
      )
    );
    update public.tasks set ueberfaellig_gemeldet_am = p_today where id = v_task.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delivery claiming: a dispatcher locks due events for 5 minutes, so parallel
-- dispatchers (request follow-up and cron) never send the same event twice.
-- ---------------------------------------------------------------------------

create function public.claim_webhook_events(p_owner uuid default null, p_limit integer default 25)
returns setof public.webhook_events
language sql
set search_path = ''
as $$
  update public.webhook_events e
  set gesperrt_bis = now() + interval '5 minutes'
  where e.id in (
    select w.id
    from public.webhook_events w
    where w.status = 'ausstehend'
      and (p_owner is null or w.owner_id = p_owner)
      and coalesce(w.naechster_versuch_am, w.created_at) <= now()
      and (w.gesperrt_bis is null or w.gesperrt_bis < now())
    order by w.created_at
    limit p_limit
    for update skip locked
  )
  returning e.*;
$$;

-- Earliest pending retry for an owner (lets the dispatcher wait for short retries).
create function public.next_webhook_retry(p_owner uuid)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select min(coalesce(naechster_versuch_am, created_at))
  from public.webhook_events
  where owner_id = p_owner and status = 'ausstehend';
$$;

-- Service-role only: these take an arbitrary owner. find_duplicates_for_owner stays callable by
-- users (through find_duplicates) because RLS limits it to their own rows anyway.
revoke execute on function public.find_duplicates_for_owner(uuid, text, text) from public, anon;
revoke execute on function public.enqueue_deal_webhooks() from public, anon, authenticated;
revoke execute on function public.enqueue_webhook(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.enqueue_overdue_task_webhooks(date) from public, anon, authenticated;
revoke execute on function public.claim_webhook_events(uuid, integer) from public, anon, authenticated;
revoke execute on function public.next_webhook_retry(uuid) from public, anon, authenticated;
grant execute on function public.find_duplicates_for_owner(uuid, text, text) to authenticated, service_role;
grant execute on function public.enqueue_webhook(uuid, text, jsonb) to service_role;
grant execute on function public.enqueue_overdue_task_webhooks(date) to service_role;
grant execute on function public.claim_webhook_events(uuid, integer) to service_role;
grant execute on function public.next_webhook_retry(uuid) to service_role;
