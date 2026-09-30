-- Initial schema for the agency CRM (phase 1).
-- Every table carries owner_id and is protected by row-level security:
-- access requires owner_id = auth.uid() and a session that passed 2FA (aal2).

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

create type public.company_status as enum ('lead', 'kunde', 'ehemalig');
create type public.automatisierungspotenzial as enum ('niedrig', 'mittel', 'hoch');
create type public.deal_stage_art as enum ('offen', 'gewonnen', 'verloren');
create type public.activity_typ as enum ('anruf', 'mail', 'meeting', 'notiz');
create type public.task_prioritaet as enum ('niedrig', 'mittel', 'hoch');
create type public.project_status as enum ('geplant', 'in_arbeit', 'abnahme', 'abgeschlossen');
create type public.retainer_status as enum ('aktiv', 'gekuendigt', 'beendet');
create type public.quote_status as enum ('entwurf', 'versendet', 'angenommen', 'abgelehnt');
create type public.invoice_status as enum ('entwurf', 'versendet', 'bezahlt', 'ueberfaellig');
create type public.invoice_art as enum ('rechnung', 'abschlagsrechnung', 'schlussrechnung', 'stornorechnung');
create type public.webhook_event_status as enum ('ausstehend', 'gesendet', 'fehlgeschlagen');

-- ---------------------------------------------------------------------------
-- Shared helper functions
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- True when the row belongs to the current user and the session passed 2FA.
create function public.is_owner(row_owner uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select row_owner = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- ---------------------------------------------------------------------------
-- Settings and configuration
-- ---------------------------------------------------------------------------

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  firmenname text,
  inhaber text,
  strasse text,
  plz text,
  ort text,
  land text not null default 'DE',
  email text,
  telefon text,
  website text,
  ust_id text,
  steuernummer text,
  bank_name text,
  iban text,
  bic text,
  standard_ust_satz numeric(5, 2) not null default 19.00 check (standard_ust_satz >= 0),
  zahlungsziel_tage integer not null default 14 check (zahlungsziel_tage >= 0),
  rechnung_praefix text not null default 'RE',
  angebot_praefix text not null default 'AN',
  webhook_urls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

-- Configurable sales pipeline; "art" marks the terminal won/lost stages.
create table public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position integer not null,
  art public.deal_stage_art not null default 'offen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- Counters for customer, quote and invoice numbers (jahr = 0 for non-yearly ranges).
create table public.number_counters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bereich text not null check (bereich in ('kunde', 'angebot', 'rechnung')),
  jahr integer not null default 0,
  letzter_wert integer not null default 0 check (letzter_wert >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, bereich, jahr)
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_praefix text not null,
  zuletzt_genutzt_am timestamptz,
  widerrufen_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  website text,
  branche text,
  groesse text,
  strasse text,
  plz text,
  ort text,
  land text not null default 'DE',
  ust_id text,
  -- Always set by the assign_kundennummer trigger; the default only keeps it optional on insert.
  kundennummer text not null default '',
  mitarbeiterzahl integer check (mitarbeiterzahl >= 0),
  tool_stack text[] not null default '{}',
  schmerzpunkte text,
  automatisierungspotenzial public.automatisierungspotenzial,
  notizen text,
  status public.company_status not null default 'lead',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kundennummer)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  vorname text,
  nachname text not null,
  email text,
  telefon text,
  position text,
  linkedin text,
  ist_hauptkontakt boolean not null default false,
  einwilligung_marketing boolean not null default false,
  einwilligung_datum timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_einwilligung_datum_check
    check (not einwilligung_marketing or einwilligung_datum is not null)
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  stage_id uuid not null references public.deal_stages (id) on delete restrict,
  titel text not null,
  wert_einmalig numeric(12, 2) not null default 0 check (wert_einmalig >= 0),
  wert_monatlich numeric(12, 2) not null default 0 check (wert_monatlich >= 0),
  wahrscheinlichkeit smallint check (wahrscheinlichkeit between 0 and 100),
  erwarteter_abschluss date,
  quelle text,
  verlustgrund text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  titel text not null,
  status public.project_status not null default 'geplant',
  start date,
  deadline date,
  festpreis numeric(12, 2) check (festpreis >= 0),
  interner_stundensatz numeric(12, 2) check (interner_stundensatz >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  datum date not null default current_date,
  minuten integer not null check (minuten > 0),
  beschreibung text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.retainers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  titel text not null,
  monatsbetrag numeric(12, 2) not null check (monatsbetrag >= 0),
  leistungsumfang text,
  start date not null,
  laufzeit_monate integer check (laufzeit_monate > 0),
  kuendigungsfrist_tage integer not null default 30 check (kuendigungsfrist_tage >= 0),
  status public.retainer_status not null default 'aktiv',
  naechste_abrechnung date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activities, tasks, files
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  typ public.activity_typ not null,
  inhalt text,
  zeitpunkt timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_link_check
    check (num_nonnulls(company_id, contact_id, deal_id, project_id) >= 1)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  titel text not null,
  faellig_am date,
  erledigt boolean not null default false,
  prioritaet public.task_prioritaet not null default 'mittel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  name text not null,
  pfad text not null,
  typ text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_link_check
    check (num_nonnulls(company_id, deal_id, project_id) >= 1)
);

-- ---------------------------------------------------------------------------
-- Quotes and invoices
-- ---------------------------------------------------------------------------

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  nummer text,
  positionen jsonb not null default '[]'::jsonb,
  summe_netto numeric(12, 2) not null default 0,
  gueltig_bis date,
  status public.quote_status not null default 'entwurf',
  pdf_pfad text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, nummer)
);

-- Invoices survive the deletion of their company (retention duty), hence "set null".
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  retainer_id uuid references public.retainers (id) on delete set null,
  storno_von_id uuid references public.invoices (id) on delete restrict,
  art public.invoice_art not null default 'rechnung',
  nummer text,
  datum date,
  faellig_am date,
  positionen jsonb not null default '[]'::jsonb,
  summe_netto numeric(12, 2) not null default 0,
  ust_satz numeric(5, 2) not null default 19.00 check (ust_satz >= 0),
  summe_brutto numeric(12, 2) not null default 0,
  status public.invoice_status not null default 'entwurf',
  pdf_pfad text,
  xml_pfad text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, nummer),
  constraint invoices_storno_check
    check ((art = 'stornorechnung') = (storno_von_id is not null))
);

-- ---------------------------------------------------------------------------
-- Webhook log
-- ---------------------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event text not null,
  payload jsonb not null,
  ziel_url text,
  status public.webhook_event_status not null default 'ausstehend',
  versuche smallint not null default 0 check (versuche >= 0),
  naechster_versuch_am timestamptz,
  gesendet_am timestamptz,
  antwort_status integer,
  fehler text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys and frequent filters
-- ---------------------------------------------------------------------------

create index companies_owner_status_idx on public.companies (owner_id, status);
create index contacts_company_id_idx on public.contacts (company_id);
create index contacts_email_idx on public.contacts (owner_id, lower(email));
create index deals_company_id_idx on public.deals (company_id);
create index deals_contact_id_idx on public.deals (contact_id);
create index deals_stage_id_idx on public.deals (stage_id);
create index projects_company_id_idx on public.projects (company_id);
create index projects_deal_id_idx on public.projects (deal_id);
create index time_entries_project_id_idx on public.time_entries (project_id);
create index retainers_company_id_idx on public.retainers (company_id);
create index retainers_deal_id_idx on public.retainers (deal_id);
create index activities_company_id_idx on public.activities (company_id, zeitpunkt desc);
create index activities_contact_id_idx on public.activities (contact_id);
create index activities_deal_id_idx on public.activities (deal_id, zeitpunkt desc);
create index activities_project_id_idx on public.activities (project_id);
create index tasks_open_due_idx on public.tasks (owner_id, faellig_am) where not erledigt;
create index tasks_company_id_idx on public.tasks (company_id);
create index tasks_deal_id_idx on public.tasks (deal_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index files_company_id_idx on public.files (company_id);
create index files_deal_id_idx on public.files (deal_id);
create index files_project_id_idx on public.files (project_id);
create index quotes_deal_id_idx on public.quotes (deal_id);
create index invoices_company_id_idx on public.invoices (company_id);
create index invoices_project_id_idx on public.invoices (project_id);
create index invoices_retainer_id_idx on public.invoices (retainer_id);
create index invoices_storno_von_id_idx on public.invoices (storno_von_id);
create index invoices_owner_status_idx on public.invoices (owner_id, status);
create index webhook_events_retry_idx on public.webhook_events (status, naechster_versuch_am);

-- ---------------------------------------------------------------------------
-- updated_at triggers and row-level security for every table
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'deal_stages', 'number_counters', 'api_keys',
    'companies', 'contacts', 'deals', 'projects', 'time_entries', 'retainers',
    'activities', 'tasks', 'files', 'quotes', 'invoices', 'webhook_events'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_access on public.%I for all to authenticated
         using (public.is_owner(owner_id)) with check (public.is_owner(owner_id))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Number ranges
-- ---------------------------------------------------------------------------

-- Atomically increments and returns the counter; the upsert locks the row,
-- so concurrent callers never receive the same value.
create function public.next_number(p_owner uuid, p_bereich text, p_jahr integer default 0)
returns integer
language sql
set search_path = ''
as $$
  insert into public.number_counters as c (owner_id, bereich, jahr, letzter_wert)
  values (p_owner, p_bereich, p_jahr, 1)
  on conflict (owner_id, bereich, jahr)
  do update set letzter_wert = c.letzter_wert + 1
  returning c.letzter_wert;
$$;

-- Customer numbers start at K1001 and run continuously (not per year).
create function public.assign_kundennummer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.kundennummer := 'K' || (1000 + public.next_number(new.owner_id, 'kunde'));
  return new;
end;
$$;

create trigger assign_kundennummer
  before insert on public.companies
  for each row execute function public.assign_kundennummer();

create function public.protect_kundennummer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kundennummer is distinct from old.kundennummer then
    raise exception 'Die Kundennummer kann nicht geändert werden.';
  end if;
  return new;
end;
$$;

create trigger protect_kundennummer
  before update on public.companies
  for each row execute function public.protect_kundennummer();

-- ---------------------------------------------------------------------------
-- Invoice immutability: once sent, only the payment status may change.
-- Corrections are made exclusively through a cancellation invoice.
-- ---------------------------------------------------------------------------

create function public.protect_sent_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'entwurf' then
      raise exception 'Versendete Rechnungen können nicht gelöscht werden.';
    end if;
    return old;
  end if;

  if old.status = 'entwurf' then
    return new;
  end if;

  if new.status = 'entwurf' then
    raise exception 'Eine versendete Rechnung kann nicht zurück in den Entwurf.';
  end if;

  if (to_jsonb(new) - array['status', 'updated_at', 'company_id', 'project_id', 'retainer_id'])
     is distinct from
     (to_jsonb(old) - array['status', 'updated_at', 'company_id', 'project_id', 'retainer_id']) then
    raise exception 'Versendete Rechnungen sind unveränderlich. Korrektur nur per Stornorechnung.';
  end if;

  return new;
end;
$$;

create trigger protect_sent_invoice
  before update or delete on public.invoices
  for each row execute function public.protect_sent_invoice();

-- ---------------------------------------------------------------------------
-- Per-user defaults: settings row and the sales pipeline from the specification
-- ---------------------------------------------------------------------------

create function public.create_owner_defaults(p_owner uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.settings (owner_id) values (p_owner)
  on conflict (owner_id) do nothing;

  insert into public.deal_stages (owner_id, name, position, art)
  values
    (p_owner, 'Neu', 1, 'offen'),
    (p_owner, 'Qualifiziert', 2, 'offen'),
    (p_owner, 'Erstgespräch', 3, 'offen'),
    (p_owner, 'Angebot', 4, 'offen'),
    (p_owner, 'Verhandlung', 5, 'offen'),
    (p_owner, 'Gewonnen', 6, 'gewonnen'),
    (p_owner, 'Verloren', 7, 'verloren')
  on conflict (owner_id, name) do nothing;
$$;

revoke execute on function public.create_owner_defaults(uuid) from public, anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_owner_defaults(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration get their defaults too.
select public.create_owner_defaults(id) from auth.users;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for quotes, contracts and invoice PDFs.
-- Object paths start with the owner's user id: <user_id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('dokumente', 'dokumente', false)
on conflict (id) do nothing;

create policy dokumente_owner_access on storage.objects
  for all to authenticated
  using (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  )
  with check (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
  );
