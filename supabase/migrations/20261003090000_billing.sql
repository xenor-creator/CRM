-- Phase 4: projects, retainers, quotes and invoices.
-- Totals are computed in the database from the line items; numbers are assigned when a
-- document is finalized (never in the client), so deleted drafts leave no gaps.

alter type public.invoice_status add value if not exists 'storniert';

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

alter table public.projects add column timer_gestartet_am timestamptz;

alter table public.retainers
  add column gekuendigt_zum date,
  add column laufzeitende_gemeldet date,
  add column kuendigungsfrist_gemeldet date,
  add constraint retainers_gekuendigt_check check (status <> 'gekuendigt' or gekuendigt_zum is not null);

alter table public.invoices
  add column leistung_von date,
  add column leistung_bis date,
  add column summe_ust numeric(12, 2) not null default 0,
  add column abschlaege jsonb not null default '[]'::jsonb,
  add column bereits_gezahlt numeric(12, 2) not null default 0,
  add column zahlbetrag numeric(12, 2) not null default 0,
  add column hinweis text,
  add column absender jsonb,
  add column empfaenger jsonb,
  add column versendet_am timestamptz,
  add column bezahlt_am date,
  add constraint invoices_leistung_check check (leistung_bis is null or leistung_von <= leistung_bis);

-- One cancellation per invoice; one retainer invoice per billing period.
create unique index invoices_one_storno_idx on public.invoices (storno_von_id) where storno_von_id is not null;
create unique index invoices_retainer_period_idx
  on public.invoices (retainer_id, leistung_von) where retainer_id is not null and art = 'rechnung';

alter table public.quotes
  add column datum date,
  add column ust_satz numeric(5, 2) not null default 19.00 check (ust_satz >= 0),
  add column summe_ust numeric(12, 2) not null default 0,
  add column summe_brutto numeric(12, 2) not null default 0,
  add column hinweis text,
  add column absender jsonb,
  add column empfaenger jsonb;

alter table public.settings
  add column angebot_gueltig_tage integer not null default 30 check (angebot_gueltig_tage > 0);

-- ---------------------------------------------------------------------------
-- Line items and totals
-- ---------------------------------------------------------------------------

-- Line items: [{ "beschreibung": text, "menge": number, "einheit": text, "einzelpreis": number }]
-- menge with up to 3 decimals, einzelpreis with up to 2 decimals (negative for cancellations).
create function public.validated_line_items(p_items jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_item jsonb;
  v_menge numeric;
  v_preis numeric;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Positionen müssen eine Liste sein.' using errcode = 'check_violation';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce(btrim(v_item ->> 'beschreibung'), '') = '' then
      raise exception 'Jede Position braucht eine Beschreibung.' using errcode = 'check_violation';
    end if;
    if not (v_item ->> 'einheit') = any (array['Stk', 'Std', 'Tag', 'Monat', 'Pauschal']) then
      raise exception 'Unbekannte Einheit „%“.', v_item ->> 'einheit' using errcode = 'check_violation';
    end if;
    if jsonb_typeof(v_item -> 'menge') <> 'number' or jsonb_typeof(v_item -> 'einzelpreis') <> 'number' then
      raise exception 'Menge und Einzelpreis müssen Zahlen sein.' using errcode = 'check_violation';
    end if;
    v_menge := (v_item ->> 'menge')::numeric;
    v_preis := (v_item ->> 'einzelpreis')::numeric;
    if v_menge = 0 or v_menge <> round(v_menge, 3) or v_preis <> round(v_preis, 2) then
      raise exception 'Menge (max. 3 Nachkommastellen, nicht 0) oder Einzelpreis (max. 2) ungültig.'
        using errcode = 'check_violation';
    end if;
  end loop;
  return p_items;
end;
$$;

-- Net total: sum of line totals, each rounded to cents (half away from zero).
create function public.line_items_net(p_items jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(round((i ->> 'menge')::numeric * (i ->> 'einzelpreis')::numeric, 2)), 0)
  from jsonb_array_elements(p_items) i;
$$;

create function public.compute_invoice_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'entwurf' then
    return new;
  end if;
  new.positionen := public.validated_line_items(new.positionen);
  new.summe_netto := public.line_items_net(new.positionen);
  new.summe_ust := round(new.summe_netto * new.ust_satz / 100, 2);
  new.summe_brutto := new.summe_netto + new.summe_ust;
  new.bereits_gezahlt := coalesce(
    (select sum((a ->> 'brutto')::numeric) from jsonb_array_elements(new.abschlaege) a), 0);
  new.zahlbetrag := new.summe_brutto - new.bereits_gezahlt;
  return new;
end;
$$;

create trigger compute_invoice_totals
  before insert or update on public.invoices
  for each row execute function public.compute_invoice_totals();

create function public.compute_quote_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status <> 'entwurf' then
    return new;
  end if;
  new.positionen := public.validated_line_items(new.positionen);
  new.summe_netto := public.line_items_net(new.positionen);
  new.summe_ust := round(new.summe_netto * new.ust_satz / 100, 2);
  new.summe_brutto := new.summe_netto + new.summe_ust;
  return new;
end;
$$;

create trigger compute_quote_totals
  before insert or update on public.quotes
  for each row execute function public.compute_quote_totals();

-- ---------------------------------------------------------------------------
-- Immutability after finalizing
-- ---------------------------------------------------------------------------

-- Sent invoices: only the status may change (to paid, overdue or cancelled), the payment
-- date may be set, and the generated PDF/XML paths may be stored once.
create or replace function public.protect_sent_invoice()
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
  if old.status = 'storniert' and new.status <> 'storniert' then
    raise exception 'Eine stornierte Rechnung kann nicht mehr geändert werden.';
  end if;
  if (old.pdf_pfad is not null and new.pdf_pfad is distinct from old.pdf_pfad)
     or (old.xml_pfad is not null and new.xml_pfad is distinct from old.xml_pfad) then
    raise exception 'Das Rechnungsdokument kann nicht ersetzt werden.';
  end if;

  if (to_jsonb(new) - array['status', 'updated_at', 'company_id', 'project_id', 'retainer_id',
                            'bezahlt_am', 'pdf_pfad', 'xml_pfad'])
     is distinct from
     (to_jsonb(old) - array['status', 'updated_at', 'company_id', 'project_id', 'retainer_id',
                            'bezahlt_am', 'pdf_pfad', 'xml_pfad']) then
    raise exception 'Versendete Rechnungen sind unveränderlich. Korrektur nur per Stornorechnung.';
  end if;

  return new;
end;
$$;

create function public.protect_sent_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or old.status = 'entwurf' then
    return coalesce(new, old);
  end if;
  if new.status = 'entwurf' then
    raise exception 'Ein versendetes Angebot kann nicht zurück in den Entwurf.';
  end if;
  if old.pdf_pfad is not null and new.pdf_pfad is distinct from old.pdf_pfad then
    raise exception 'Das Angebotsdokument kann nicht ersetzt werden.';
  end if;
  if (to_jsonb(new) - array['status', 'updated_at', 'pdf_pfad'])
     is distinct from (to_jsonb(old) - array['status', 'updated_at', 'pdf_pfad']) then
    raise exception 'Versendete Angebote sind unveränderlich.';
  end if;
  return new;
end;
$$;

create trigger protect_sent_quote
  before update or delete on public.quotes
  for each row execute function public.protect_sent_quote();

-- ---------------------------------------------------------------------------
-- Finalizing: validation, number assignment, sender/recipient snapshot
-- ---------------------------------------------------------------------------

create function public.seller_snapshot(p_owner uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.settings;
begin
  select * into s from public.settings where owner_id = p_owner;
  if s.firmenname is null or s.strasse is null or s.plz is null or s.ort is null or s.iban is null
     or (s.steuernummer is null and s.ust_id is null) then
    raise exception 'Bitte zuerst Firmendaten, Adresse, Steuernummer oder USt-IdNr. und IBAN in den Einstellungen hinterlegen.'
      using errcode = 'check_violation';
  end if;
  return jsonb_build_object(
    'firmenname', s.firmenname, 'inhaber', s.inhaber, 'strasse', s.strasse, 'plz', s.plz,
    'ort', s.ort, 'land', s.land, 'email', s.email, 'telefon', s.telefon, 'website', s.website,
    'ust_id', s.ust_id, 'steuernummer', s.steuernummer, 'bank_name', s.bank_name,
    'iban', s.iban, 'bic', s.bic
  );
end;
$$;

create function public.buyer_snapshot(p_company uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.companies;
  k public.contacts;
begin
  select * into c from public.companies where id = p_company;
  if not found then
    raise exception 'Der Empfänger (Firma) fehlt.' using errcode = 'check_violation';
  end if;
  if c.plz is null or c.ort is null then
    raise exception 'Die Adresse von „%“ ist unvollständig (PLZ und Ort sind Pflicht).', c.name
      using errcode = 'check_violation';
  end if;
  select * into k from public.contacts
  where company_id = c.id order by ist_hauptkontakt desc, created_at limit 1;
  return jsonb_build_object(
    'name', c.name, 'kundennummer', c.kundennummer, 'strasse', c.strasse, 'plz', c.plz,
    'ort', c.ort, 'land', c.land, 'ust_id', c.ust_id,
    'kontakt', case when k.id is null then null
               else jsonb_build_object('name', concat_ws(' ', k.vorname, k.nachname), 'email', k.email) end
  );
end;
$$;

create function public.finalize_invoice(p_invoice uuid, p_datum date default current_date)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare
  inv public.invoices;
  v_seller jsonb;
  v_buyer jsonb;
  v_year integer := extract(year from p_datum)::integer;
  v_prefix text;
  v_original public.invoice_status;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  if not found then
    raise exception 'Rechnung nicht gefunden.' using errcode = 'no_data_found';
  end if;
  if inv.status <> 'entwurf' then
    raise exception 'Nur Entwürfe können abgeschlossen werden.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(inv.positionen) = 0 then
    raise exception 'Die Rechnung hat keine Positionen.' using errcode = 'check_violation';
  end if;
  if inv.leistung_von is null then
    raise exception 'Bitte das Leistungsdatum bzw. den Leistungszeitraum angeben.' using errcode = 'check_violation';
  end if;
  if inv.art = 'stornorechnung' then
    select status into v_original from public.invoices where id = inv.storno_von_id for update;
    if v_original in ('entwurf', 'storniert') then
      raise exception 'Die Originalrechnung kann nicht storniert werden.' using errcode = 'check_violation';
    end if;
  end if;

  v_seller := public.seller_snapshot(inv.owner_id);
  v_buyer := public.buyer_snapshot(inv.company_id);
  select rechnung_praefix into v_prefix from public.settings where owner_id = inv.owner_id;

  update public.invoices
  set nummer = format('%s-%s-%s-%s', v_prefix, v_year,
                      lpad(public.next_number(inv.owner_id, 'rechnung', v_year)::text, 4, '0'),
                      v_buyer ->> 'kundennummer'),
      datum = p_datum,
      faellig_am = p_datum + (select zahlungsziel_tage from public.settings where owner_id = inv.owner_id),
      status = 'versendet',
      versendet_am = now(),
      absender = v_seller,
      empfaenger = v_buyer
  where id = p_invoice
  returning * into inv;

  if inv.art = 'stornorechnung' then
    update public.invoices set status = 'storniert' where id = inv.storno_von_id;
  end if;
  return inv;
end;
$$;

create function public.finalize_quote(p_quote uuid, p_datum date default current_date)
returns public.quotes
language plpgsql
set search_path = ''
as $$
declare
  q public.quotes;
  v_company uuid;
  v_seller jsonb;
  v_buyer jsonb;
  v_year integer := extract(year from p_datum)::integer;
  v_settings public.settings;
begin
  select * into q from public.quotes where id = p_quote for update;
  if not found then
    raise exception 'Angebot nicht gefunden.' using errcode = 'no_data_found';
  end if;
  if q.status <> 'entwurf' then
    raise exception 'Nur Entwürfe können versendet werden.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(q.positionen) = 0 then
    raise exception 'Das Angebot hat keine Positionen.' using errcode = 'check_violation';
  end if;

  select company_id into v_company from public.deals where id = q.deal_id;
  v_seller := public.seller_snapshot(q.owner_id);
  v_buyer := public.buyer_snapshot(v_company);
  select * into v_settings from public.settings where owner_id = q.owner_id;

  update public.quotes
  set nummer = format('%s-%s-%s-%s', v_settings.angebot_praefix, v_year,
                      lpad(public.next_number(q.owner_id, 'angebot', v_year)::text, 4, '0'),
                      v_buyer ->> 'kundennummer'),
      datum = p_datum,
      gueltig_bis = coalesce(q.gueltig_bis, p_datum + v_settings.angebot_gueltig_tage),
      status = 'versendet',
      absender = v_seller,
      empfaenger = v_buyer
  where id = p_quote
  returning * into q;
  return q;
end;
$$;

-- Draft cancellation invoice for a finalized invoice: negated line items and prepayments.
create function public.create_storno_draft(p_invoice uuid)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare
  orig public.invoices;
  storno public.invoices;
begin
  select * into orig from public.invoices where id = p_invoice;
  if not found or orig.status in ('entwurf', 'storniert') or orig.art = 'stornorechnung' then
    raise exception 'Nur versendete, nicht stornierte Rechnungen können storniert werden.'
      using errcode = 'check_violation';
  end if;

  insert into public.invoices (owner_id, company_id, project_id, retainer_id, storno_von_id, art,
                               positionen, ust_satz, abschlaege, leistung_von, leistung_bis, hinweis)
  values (
    orig.owner_id, orig.company_id, orig.project_id, orig.retainer_id, orig.id, 'stornorechnung',
    (select coalesce(jsonb_agg(i || jsonb_build_object('einzelpreis', -((i ->> 'einzelpreis')::numeric))), '[]')
     from jsonb_array_elements(orig.positionen) i),
    orig.ust_satz,
    (select coalesce(jsonb_agg(a || jsonb_build_object(
        'netto', -((a ->> 'netto')::numeric), 'ust', -((a ->> 'ust')::numeric),
        'brutto', -((a ->> 'brutto')::numeric))), '[]')
     from jsonb_array_elements(orig.abschlaege) a),
    orig.leistung_von, orig.leistung_bis,
    format('Stornierung der Rechnung %s vom %s.', orig.nummer, to_char(orig.datum, 'DD.MM.YYYY'))
  )
  returning * into storno;
  return storno;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invoice webhooks (security definer: users may not call enqueue_webhook directly)
-- ---------------------------------------------------------------------------

create function public.enqueue_invoice_webhooks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  v_event := case
    when old.status = 'entwurf' and new.status = 'versendet' then 'invoice.created'
    when new.status = 'ueberfaellig' then 'invoice.overdue'
    when new.status = 'bezahlt' then 'invoice.paid'
  end;
  if v_event is not null then
    perform public.enqueue_webhook(
      new.owner_id,
      v_event,
      jsonb_build_object(
        'invoice', to_jsonb(new) - array['owner_id', 'pdf_pfad', 'xml_pfad'],
        'company', (select jsonb_build_object('id', c.id, 'name', c.name, 'kundennummer', c.kundennummer)
                    from public.companies c where c.id = new.company_id)
      )
    );
  end if;
  return new;
end;
$$;

create trigger enqueue_invoice_webhooks
  after update of status on public.invoices
  for each row execute function public.enqueue_invoice_webhooks();

-- Daily cron (service role): sent invoices past their due date become overdue.
create function public.mark_overdue_invoices(p_today date)
returns integer
language sql
set search_path = ''
as $$
  with updated as (
    update public.invoices
    set status = 'ueberfaellig'
    where status = 'versendet' and art <> 'stornorechnung' and faellig_am < p_today
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke execute on function public.enqueue_invoice_webhooks() from public, anon, authenticated;
revoke execute on function public.mark_overdue_invoices(date) from public, anon, authenticated;
grant execute on function public.mark_overdue_invoices(date) to service_role;
