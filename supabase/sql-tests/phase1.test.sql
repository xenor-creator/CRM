-- Database tests for phase 1: RLS, 2FA enforcement, customer numbers, invoice immutability.
-- Run with: pnpm test:db (requires DATABASE_URL). Everything is rolled back at the end.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

-- New users receive default settings and the pipeline stages.
do $$
begin
  assert (select count(*) from public.deal_stages
          where owner_id = '11111111-1111-1111-1111-111111111111') = 7,
    'default deal stages missing';
  assert (select count(*) from public.settings
          where owner_id = '11111111-1111-1111-1111-111111111111') = 1,
    'default settings missing';
end;
$$;

-- Anonymous requests see nothing.
set local role anon;
do $$
begin
  assert (select count(*) from public.deal_stages) = 0, 'anon can read deal_stages';
end;
$$;
reset role;

-- Logged in without 2FA (aal1): no data access.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', true);
do $$
begin
  assert (select count(*) from public.deal_stages) = 0, 'aal1 session can read data';
  begin
    insert into public.companies (name) values ('Beispiel GmbH');
    assert false, 'aal1 session could insert';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Owner with 2FA (aal2): full access, continuous customer numbers.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);
do $$
declare
  k1 text;
  k2 text;
begin
  assert (select count(*) from public.deal_stages) = 7, 'owner cannot read own stages';
  insert into public.companies (name, kundennummer) values ('Beispiel GmbH', 'X') returning kundennummer into k1;
  insert into public.companies (name) values ('Muster AG') returning kundennummer into k2;
  assert k1 = 'K1001', format('expected K1001, got %s', k1);
  assert k2 = 'K1002', format('expected K1002, got %s', k2);

  begin
    update public.companies set kundennummer = 'K9999' where kundennummer = 'K1001';
    assert false, 'kundennummer was changed';
  exception when raise_exception then
    null;
  end;

  begin
    insert into public.contacts (company_id, nachname, einwilligung_marketing)
    select id, 'Mustermann', true from public.companies where kundennummer = 'K1001';
    assert false, 'marketing consent without date was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

-- Invoice immutability after sending.
do $$
declare
  inv uuid;
begin
  insert into public.invoices (company_id, nummer, summe_netto, summe_brutto)
  select id, 'RE-2026-0001-K1001', 100.00, 119.00 from public.companies where kundennummer = 'K1001'
  returning id into inv;

  update public.invoices set summe_netto = 200.00, summe_brutto = 238.00 where id = inv;
  update public.invoices set status = 'versendet' where id = inv;

  begin
    update public.invoices set summe_netto = 300.00 where id = inv;
    assert false, 'sent invoice amount was changed';
  exception when raise_exception then
    null;
  end;

  begin
    update public.invoices set status = 'entwurf' where id = inv;
    assert false, 'sent invoice went back to draft';
  exception when raise_exception then
    null;
  end;

  begin
    delete from public.invoices where id = inv;
    assert false, 'sent invoice was deleted';
  exception when raise_exception then
    null;
  end;

  update public.invoices set status = 'bezahlt' where id = inv;
  assert (select status from public.invoices where id = inv) = 'bezahlt', 'payment status not updated';
end;
$$;

-- Another user sees none of the owner's rows and starts their own number range.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal2"}', true);
do $$
declare
  k text;
begin
  assert (select count(*) from public.companies) = 0, 'foreign companies visible';
  assert (select count(*) from public.invoices) = 0, 'foreign invoices visible';
  insert into public.companies (name) values ('Andere GmbH') returning kundennummer into k;
  assert k = 'K1001', format('expected K1001 for second owner, got %s', k);
  begin
    insert into public.companies (owner_id, name)
    values ('11111111-1111-1111-1111-111111111111', 'Fremd GmbH');
    assert false, 'inserted row for another owner';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select 'phase1 database tests passed' as result;
rollback;
