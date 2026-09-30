-- Phase 2 (sales): pipeline rules, duplicate detection and deal activity tracking.

-- ---------------------------------------------------------------------------
-- Normalized company domain for duplicate detection
-- ---------------------------------------------------------------------------

-- "https://www.Example.de/kontakt" -> "example.de"
create function public.normalize_domain(url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(btrim(url)), '^[a-z][a-z0-9+.-]*://', ''),
      '^www\.|[/:?#].*$', '', 'g'
    ),
    ''
  );
$$;

alter table public.companies
  add column domain text generated always as (public.normalize_domain(website)) stored;

create index companies_owner_domain_idx on public.companies (owner_id, domain);

-- Free-mail providers never identify a company, so their domains are ignored.
create function public.is_freemail_domain(domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(domain) = any (array[
    'gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch', 'web.de',
    'outlook.com', 'outlook.de', 'hotmail.com', 'hotmail.de', 'live.com', 'live.de',
    'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com', 't-online.de', 'aol.com',
    'posteo.de', 'mail.de', 'freenet.de', 'proton.me', 'protonmail.com', 'mailbox.org'
  ]);
$$;

-- Companies that match an e-mail address or website. Runs with the caller's
-- rights, so RLS limits the result to the caller's own rows.
create function public.find_duplicates(p_email text default null, p_website text default null)
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
    where i.email is not null and lower(c.email) = i.email
    union
    select co.id, 'domain'
    from public.companies co, input i
    where co.domain is not null
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

-- ---------------------------------------------------------------------------
-- Deal stage rules
-- ---------------------------------------------------------------------------

alter table public.deals add column abgeschlossen_am timestamptz;

-- Validates the stage, requires a loss reason and maintains abgeschlossen_am.
create function public.apply_deal_stage_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_art public.deal_stage_art;
begin
  select s.art into v_art
  from public.deal_stages s
  where s.id = new.stage_id and s.owner_id = new.owner_id;

  if v_art is null then
    raise exception 'Unbekannte Vertriebsphase.' using errcode = 'foreign_key_violation';
  end if;

  if v_art = 'verloren' then
    if coalesce(btrim(new.verlustgrund), '') = '' then
      raise exception 'Beim Wechsel auf „Verloren“ ist ein Verlustgrund Pflicht.'
        using errcode = 'check_violation';
    end if;
  else
    new.verlustgrund := null;
  end if;

  if v_art = 'offen' then
    new.abgeschlossen_am := null;
  elsif tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.abgeschlossen_am := now();
  end if;

  return new;
end;
$$;

create trigger apply_deal_stage_rules
  before insert or update of stage_id, verlustgrund, abgeschlossen_am on public.deals
  for each row execute function public.apply_deal_stage_rules();

-- A won deal turns its company into a customer.
create function public.mark_company_as_customer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.deal_stages s where s.id = new.stage_id and s.art = 'gewonnen'
  ) then
    update public.companies
    set status = 'kunde'
    where id = new.company_id and status <> 'kunde';
  end if;
  return new;
end;
$$;

create trigger mark_company_as_customer
  after insert or update of stage_id on public.deals
  for each row execute function public.mark_company_as_customer();

-- ---------------------------------------------------------------------------
-- Last activity per deal (for the 14-day inactivity warning).
-- Counts activities on the deal itself and company activities without a deal.
-- The deal's creation counts as its first activity.
-- ---------------------------------------------------------------------------

create view public.deal_activity_status
with (security_invoker = true)
as
select
  d.id as deal_id,
  d.owner_id,
  greatest(d.created_at, max(a.zeitpunkt)) as letzte_aktivitaet
from public.deals d
left join public.activities a
  on a.deal_id = d.id
  or (a.deal_id is null and a.company_id = d.company_id)
group by d.id, d.owner_id, d.created_at;

-- ---------------------------------------------------------------------------
-- Contacts: one main contact per company, consent date maintained automatically
-- ---------------------------------------------------------------------------

create function public.ensure_single_main_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.contacts
  set ist_hauptkontakt = false
  where company_id = new.company_id and id <> new.id and ist_hauptkontakt;
  return new;
end;
$$;

create trigger ensure_single_main_contact
  before insert or update of ist_hauptkontakt, company_id on public.contacts
  for each row when (new.ist_hauptkontakt)
  execute function public.ensure_single_main_contact();

create unique index contacts_one_main_per_company
  on public.contacts (company_id) where ist_hauptkontakt;

-- Granting consent records the time; withdrawing it clears the date.
create function public.apply_consent_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.einwilligung_marketing then
    new.einwilligung_datum := null;
  elsif new.einwilligung_datum is null then
    new.einwilligung_datum := now();
  end if;
  return new;
end;
$$;

create trigger apply_consent_date
  before insert or update of einwilligung_marketing, einwilligung_datum on public.contacts
  for each row execute function public.apply_consent_date();
