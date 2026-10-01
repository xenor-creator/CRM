-- Phase 5: retention of sent quotes, GDPR deletion side effects, file uploads.

-- ---------------------------------------------------------------------------
-- Quotes are business letters (6 years retention, § 257 HGB): sent quotes
-- survive the deletion of their deal or company; drafts are deleted with it.
-- ---------------------------------------------------------------------------

alter table public.quotes
  alter column deal_id drop not null,
  drop constraint quotes_deal_id_fkey,
  add constraint quotes_deal_id_fkey
    foreign key (deal_id) references public.deals (id) on delete set null;

create function public.delete_draft_quotes_of_deal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.quotes where deal_id = old.id and status = 'entwurf';
  return old;
end;
$$;

create trigger delete_draft_quotes
  before delete on public.deals
  for each row execute function public.delete_draft_quotes_of_deal();

-- Sent quotes cannot be deleted; detaching them from a deleted deal is allowed.
create or replace function public.protect_sent_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Versendete Angebote müssen aufbewahrt werden und können nicht gelöscht werden.';
    end if;
    return old;
  end if;
  if old.status = 'entwurf' then
    return new;
  end if;
  if new.status = 'entwurf' then
    raise exception 'Ein versendetes Angebot kann nicht zurück in den Entwurf.';
  end if;
  if old.pdf_pfad is not null and new.pdf_pfad is distinct from old.pdf_pfad then
    raise exception 'Das Angebotsdokument kann nicht ersetzt werden.';
  end if;
  if new.deal_id is not null and new.deal_id is distinct from old.deal_id then
    raise exception 'Versendete Angebote sind unveränderlich.';
  end if;
  if (to_jsonb(new) - array['status', 'updated_at', 'pdf_pfad', 'deal_id'])
     is distinct from (to_jsonb(old) - array['status', 'updated_at', 'pdf_pfad', 'deal_id']) then
    raise exception 'Versendete Angebote sind unveränderlich.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Webhook log: payloads contain personal data. Deleting a contact or company
-- removes every logged event that mentions it; the daily cron drops finished
-- events after 30 days.
-- ---------------------------------------------------------------------------

create function public.purge_webhook_events_mentioning()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.webhook_events
  where owner_id = old.owner_id
    and strpos(payload::text, old.id::text) > 0;
  return old;
end;
$$;

create trigger purge_webhook_events
  after delete on public.contacts
  for each row execute function public.purge_webhook_events_mentioning();

create trigger purge_webhook_events
  after delete on public.companies
  for each row execute function public.purge_webhook_events_mentioning();

create function public.purge_old_webhook_events(p_before timestamptz)
returns integer
language sql
set search_path = ''
as $$
  with deleted as (
    delete from public.webhook_events
    where status <> 'ausstehend' and created_at < p_before
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke execute on function public.purge_old_webhook_events(timestamptz) from public, anon, authenticated;
grant execute on function public.purge_old_webhook_events(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- Files: size, company derived from deal/project (so deleting a company finds
-- every file), and a queue of storage objects to remove after row deletion
-- (cascades cannot reach Supabase Storage).
-- ---------------------------------------------------------------------------

-- Uploads go straight from the browser to Storage (signed upload URL, because Vercel functions
-- accept at most 4.5 MB), so the bucket enforces the 10 MB limit itself.
update storage.buckets set file_size_limit = 10485760 where id = 'dokumente';

alter table public.files
  add column groesse bigint check (groesse between 0 and 10485760),
  add constraint files_pfad_unique unique (pfad);

create function public.storage_path_owner(p_path text)
returns text
language sql
immutable
set search_path = ''
as $$
  select split_part(p_path, '/', 1);
$$;

create function public.files_fill_company()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id is null and new.deal_id is not null then
    select company_id into new.company_id from public.deals where id = new.deal_id;
  end if;
  if new.company_id is null and new.project_id is not null then
    select company_id into new.company_id from public.projects where id = new.project_id;
  end if;
  if public.storage_path_owner(new.pfad) is distinct from new.owner_id::text then
    raise exception 'Der Dateipfad gehört nicht zum Eigentümer.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger files_fill_company
  before insert or update on public.files
  for each row execute function public.files_fill_company();

create table public.storage_deletions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pfad text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.storage_deletions
  for each row execute function public.set_updated_at();
alter table public.storage_deletions enable row level security;
create policy owner_access on public.storage_deletions for all to authenticated
  using (public.is_owner(owner_id)) with check (public.is_owner(owner_id));

create function public.queue_storage_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.storage_deletions (owner_id, pfad) values (old.owner_id, old.pfad);
  return old;
end;
$$;

create trigger queue_storage_deletion
  after delete on public.files
  for each row execute function public.queue_storage_deletion();
