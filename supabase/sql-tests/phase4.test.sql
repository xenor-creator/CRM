-- Database tests for phase 4: totals, numbering, finalizing, immutability, cancellation, webhooks.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'owner@example.test');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);

-- Totals: line totals rounded to cents, VAT on the net total.
do $$
declare
  c_id uuid;
  inv public.invoices;
begin
  insert into public.companies (name, strasse, plz, ort) values ('Rechnung GmbH', 'Musterweg 1', '12345', 'Musterstadt')
  returning id into c_id;
  insert into public.invoices (company_id, positionen, leistung_von)
  values (c_id, '[{"beschreibung":"Workshop","menge":1.5,"einheit":"Std","einzelpreis":95.33},
                  {"beschreibung":"Pauschale","menge":1,"einheit":"Pauschal","einzelpreis":1000}]', current_date)
  returning * into inv;
  -- 1.5 * 95.33 = 142.995 -> 143.00; net 1143.00; VAT 19 % = 217.17; gross 1360.17
  assert inv.summe_netto = 1143.00, format('net %s', inv.summe_netto);
  assert inv.summe_ust = 217.17, format('vat %s', inv.summe_ust);
  assert inv.summe_brutto = 1360.17, format('gross %s', inv.summe_brutto);
  assert inv.zahlbetrag = 1360.17, 'payable';

  update public.invoices set summe_netto = 1 where id = inv.id;
  assert (select summe_netto from public.invoices where id = inv.id) = 1143.00, 'client-supplied total accepted';

  begin
    update public.invoices set positionen = '[{"beschreibung":"x","menge":1,"einheit":"Kiste","einzelpreis":1}]' where id = inv.id;
    assert false, 'unknown unit accepted';
  exception when check_violation then null;
  end;
  begin
    update public.invoices set positionen = '[{"beschreibung":"x","menge":1,"einheit":"Stk","einzelpreis":1.005}]' where id = inv.id;
    assert false, 'three decimal price accepted';
  exception when check_violation then null;
  end;
end;
$$;

-- Finalizing requires seller data, then assigns RE-YYYY-NNNN-Kxxxx and freezes the invoice.
do $$
declare
  inv public.invoices;
  i2 public.invoices;
begin
  select * into inv from public.invoices limit 1;
  begin
    perform public.finalize_invoice(inv.id, '2026-10-02');
    assert false, 'finalized without seller data';
  exception when check_violation then null;
  end;
  assert (select letzter_wert from public.number_counters where bereich = 'rechnung') is null, 'number consumed by failed finalize';

  update public.settings set firmenname = 'Agentur Beispiel', strasse = 'Hauptstr. 1', plz = '10115', ort = 'Berlin',
    iban = 'DE02120300000000202051', steuernummer = '11/111/11111', zahlungsziel_tage = 14;

  inv := public.finalize_invoice(inv.id, '2026-10-02');
  assert inv.nummer = 'RE-2026-0001-K1001', format('number %s', inv.nummer);
  assert inv.status = 'versendet' and inv.faellig_am = '2026-10-16', 'status/due date';
  assert inv.absender ->> 'firmenname' = 'Agentur Beispiel' and inv.empfaenger ->> 'ort' = 'Musterstadt', 'snapshots';

  begin
    update public.invoices set positionen = '[]' where id = inv.id;
    assert false, 'sent invoice changed';
  exception when raise_exception then null;
  end;
  update public.invoices set pdf_pfad = 'x/re.pdf' where id = inv.id;
  begin
    update public.invoices set pdf_pfad = 'x/anders.pdf' where id = inv.id;
    assert false, 'pdf replaced';
  exception when raise_exception then null;
  end;

  -- Second invoice same year, then new year restarts at 0001.
  insert into public.invoices (company_id, positionen, leistung_von)
  select company_id, positionen, leistung_von from public.invoices where id = inv.id returning * into i2;
  i2 := public.finalize_invoice(i2.id, '2026-12-31');
  assert i2.nummer = 'RE-2026-0002-K1001', format('second number %s', i2.nummer);
  insert into public.invoices (company_id, positionen, leistung_von)
  select company_id, positionen, leistung_von from public.invoices where id = inv.id returning * into i2;
  i2 := public.finalize_invoice(i2.id, '2027-01-02');
  assert i2.nummer = 'RE-2027-0001-K1001', format('new year number %s', i2.nummer);

  begin
    perform public.finalize_invoice(i2.id);
    assert false, 'finalized twice';
  exception when check_violation then null;
  end;
end;
$$;

-- Cancellation: negated draft, own number, original becomes storniert, only once.
do $$
declare
  orig public.invoices;
  storno public.invoices;
begin
  select * into orig from public.invoices where nummer = 'RE-2026-0001-K1001';
  storno := public.create_storno_draft(orig.id);
  assert storno.art = 'stornorechnung' and storno.summe_brutto = -1360.17, format('storno gross %s', storno.summe_brutto);
  begin
    perform public.create_storno_draft(orig.id);
    assert false, 'second storno draft';
  exception when unique_violation then null;
  end;
  storno := public.finalize_invoice(storno.id, '2027-01-03');
  assert storno.nummer = 'RE-2027-0002-K1001', format('storno number %s', storno.nummer);
  assert (select status from public.invoices where id = orig.id) = 'storniert', 'original not cancelled';
  begin
    update public.invoices set status = 'bezahlt' where id = orig.id;
    assert false, 'cancelled invoice reopened';
  exception when raise_exception then null;
  end;
end;
$$;

-- Final invoice deducts prepayments.
do $$
declare
  inv public.invoices;
begin
  insert into public.invoices (company_id, art, positionen, leistung_von, abschlaege)
  select id, 'schlussrechnung', '[{"beschreibung":"Festpreis","menge":1,"einheit":"Pauschal","einzelpreis":10000}]', current_date,
         '[{"nummer":"RE-2026-0002-K1001","datum":"2026-12-31","netto":3000,"ust":570,"brutto":3570}]'
  from public.companies limit 1
  returning * into inv;
  assert inv.summe_brutto = 11900 and inv.bereits_gezahlt = 3570 and inv.zahlbetrag = 8330, format('final %s/%s', inv.bereits_gezahlt, inv.zahlbetrag);
end;
$$;

-- Quotes: totals, AN number, validity default, immutability.
do $$
declare
  d_id uuid;
  q public.quotes;
begin
  insert into public.deals (company_id, stage_id, titel)
  select c.id, s.id, 'Angebotsdeal' from public.companies c, public.deal_stages s where s.name = 'Angebot'
  returning id into d_id;
  insert into public.quotes (deal_id, positionen)
  values (d_id, '[{"beschreibung":"Automatisierung","menge":1,"einheit":"Pauschal","einzelpreis":4800}]')
  returning * into q;
  assert q.summe_brutto = 5712, format('quote gross %s', q.summe_brutto);
  q := public.finalize_quote(q.id, '2026-10-02');
  assert q.nummer = 'AN-2026-0001-K1001' and q.gueltig_bis = '2026-11-01', format('quote %s %s', q.nummer, q.gueltig_bis);
  update public.quotes set status = 'angenommen' where id = q.id;
  begin
    update public.quotes set positionen = '[]' where id = q.id;
    assert false, 'sent quote changed';
  exception when raise_exception then null;
  end;
end;
$$;

-- Webhooks for invoice status changes; one retainer invoice per period.
do $$
declare
  inv public.invoices;
  r_id uuid;
begin
  update public.settings set webhook_urls = '{"invoice.created":"https://n8n.example.test/c","invoice.paid":"https://n8n.example.test/p","invoice.overdue":"https://n8n.example.test/o"}';
  insert into public.invoices (company_id, positionen, leistung_von)
  select id, '[{"beschreibung":"x","menge":1,"einheit":"Stk","einzelpreis":10}]', current_date from public.companies limit 1
  returning * into inv;
  inv := public.finalize_invoice(inv.id, current_date - 30);
  assert (select count(*) from public.webhook_events where event = 'invoice.created') = 1, 'invoice.created missing';
  assert (select payload #>> '{data,invoice,nummer}' from public.webhook_events where event = 'invoice.created') = inv.nummer, 'payload number';
  update public.invoices set status = 'bezahlt', bezahlt_am = current_date where id = inv.id;
  assert (select count(*) from public.webhook_events where event = 'invoice.paid') = 1, 'invoice.paid missing';

  insert into public.retainers (company_id, titel, monatsbetrag, start)
  select id, 'Betreuung', 500, '2026-10-01' from public.companies limit 1 returning id into r_id;
  insert into public.invoices (company_id, retainer_id, positionen, leistung_von, leistung_bis)
  select company_id, r_id, '[{"beschreibung":"Betreuung","menge":1,"einheit":"Monat","einzelpreis":500}]', '2026-10-01', '2026-10-31'
  from public.retainers where id = r_id;
  begin
    insert into public.invoices (company_id, retainer_id, positionen, leistung_von, leistung_bis)
    select company_id, r_id, '[]', '2026-10-01', '2026-10-31' from public.retainers where id = r_id;
    assert false, 'duplicate retainer period';
  exception when unique_violation then null;
  end;
  begin
    update public.retainers set status = 'gekuendigt' where id = r_id;
    assert false, 'cancelled retainer without end date';
  exception when check_violation then null;
  end;
end;
$$;

-- Overdue marking (service role).
reset role;
set local role service_role;
do $$
declare
  marked integer;
begin
  insert into public.invoices (owner_id, company_id, positionen, leistung_von)
  select owner_id, id, '[{"beschreibung":"x","menge":1,"einheit":"Stk","einzelpreis":10}]', current_date from public.companies limit 1;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);
  perform public.finalize_invoice((select id from public.invoices where status = 'entwurf' and art = 'rechnung' and retainer_id is null limit 1), current_date - 20);
  marked := public.mark_overdue_invoices(current_date);
  -- Only the invoice dated 20 days ago is past due; future-dated, paid and cancellation invoices are not.
  assert marked = 1, format('expected 1 overdue invoice, got %s', marked);
  assert (select count(*) from public.webhook_events where event = 'invoice.overdue') = 1, 'invoice.overdue missing';
  assert public.mark_overdue_invoices(current_date) = 0, 'marked twice';
end;
$$;

reset role;
select 'phase4 database tests passed' as result;
rollback;
