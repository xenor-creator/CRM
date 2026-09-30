-- Database tests for phase 2: pipeline rules, duplicate detection, deal activity status.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);

-- Domain normalization.
do $$
begin
  assert public.normalize_domain('https://www.Beispiel-GmbH.de/kontakt?x=1') = 'beispiel-gmbh.de', 'full url';
  assert public.normalize_domain('beispiel.de') = 'beispiel.de', 'bare domain';
  assert public.normalize_domain('http://beispiel.de:8080') = 'beispiel.de', 'port';
  assert public.normalize_domain('  ') is null, 'blank';
  assert public.normalize_domain(null) is null, 'null';
end;
$$;

-- Duplicate detection by contact e-mail, website domain and company e-mail domain.
do $$
declare
  c_id uuid;
begin
  insert into public.companies (name, website) values ('Beispiel GmbH', 'https://www.beispiel.de')
  returning id into c_id;
  insert into public.contacts (company_id, nachname, email) values (c_id, 'Muster', 'Max.Muster@beispiel.de');
  insert into public.companies (name) values ('Ohne Website AG');

  assert (select count(*) from public.find_duplicates(p_email => 'max.muster@beispiel.de')) = 1, 'email match';
  assert (select grund from public.find_duplicates(p_email => 'max.muster@beispiel.de')) = 'domain,email', 'email + domain reason';
  assert (select grund from public.find_duplicates(p_email => 'neu@beispiel.de')) = 'domain', 'email domain match';
  assert (select grund from public.find_duplicates(p_website => 'beispiel.de/impressum')) = 'domain', 'website match';
  assert (select count(*) from public.find_duplicates(p_email => 'jemand@gmail.com')) = 0, 'freemail ignored';
  assert (select count(*) from public.find_duplicates(p_email => 'x@andere.de', p_website => 'andere.de')) = 0, 'no match';
  assert (select count(*) from public.find_duplicates()) = 0, 'no input';
end;
$$;

-- Pipeline: lost requires a reason, closing sets abgeschlossen_am, won makes the company a customer.
do $$
declare
  c_id uuid;
  d_id uuid;
  s_neu uuid;
  s_verhandlung uuid;
  s_gewonnen uuid;
  s_verloren uuid;
begin
  select id into s_neu from public.deal_stages where name = 'Neu';
  select id into s_verhandlung from public.deal_stages where name = 'Verhandlung';
  select id into s_gewonnen from public.deal_stages where art = 'gewonnen';
  select id into s_verloren from public.deal_stages where art = 'verloren';
  select id into c_id from public.companies where name = 'Beispiel GmbH';

  insert into public.deals (company_id, stage_id, titel, wert_einmalig)
  values (c_id, s_neu, 'Automatisierung Angebotsprozess', 4800.00)
  returning id into d_id;
  assert (select abgeschlossen_am from public.deals where id = d_id) is null, 'open deal has no close date';

  begin
    update public.deals set stage_id = s_verloren where id = d_id;
    assert false, 'lost without reason was accepted';
  exception when check_violation then
    null;
  end;

  begin
    update public.deals set stage_id = s_verloren, verlustgrund = '   ' where id = d_id;
    assert false, 'blank loss reason was accepted';
  exception when check_violation then
    null;
  end;

  update public.deals set stage_id = s_verloren, verlustgrund = 'Budget fehlt' where id = d_id;
  assert (select abgeschlossen_am from public.deals where id = d_id) is not null, 'lost deal has close date';
  assert (select status from public.companies where id = c_id) = 'lead', 'lost deal changed company status';

  update public.deals set stage_id = s_verhandlung where id = d_id;
  assert (select abgeschlossen_am from public.deals where id = d_id) is null, 'reopened deal keeps close date';
  assert (select verlustgrund from public.deals where id = d_id) is null, 'reopened deal keeps loss reason';

  update public.deals set stage_id = s_gewonnen where id = d_id;
  assert (select abgeschlossen_am from public.deals where id = d_id) is not null, 'won deal has close date';
  assert (select status from public.companies where id = c_id) = 'kunde', 'won deal did not make company a customer';
end;
$$;

-- Deals cannot use another owner's stage.
do $$
declare
  foreign_stage uuid;
begin
  reset role;
  select id into foreign_stage from public.deal_stages
  where owner_id = '22222222-2222-2222-2222-222222222222' and name = 'Neu';
  set local role authenticated;

  begin
    insert into public.deals (company_id, stage_id, titel)
    select id, foreign_stage, 'Fremde Phase' from public.companies where name = 'Beispiel GmbH';
    assert false, 'foreign stage was accepted';
  exception when foreign_key_violation then
    null;
  end;
end;
$$;

-- Deal activity status: deal activities and company activities without a deal count.
do $$
declare
  c_id uuid;
  d_id uuid;
begin
  select id into c_id from public.companies where name = 'Ohne Website AG';
  insert into public.deals (company_id, stage_id, titel)
  select c_id, id, 'Chatbot' from public.deal_stages where name = 'Neu'
  returning id into d_id;
  update public.deals set created_at = now() - interval '30 days' where id = d_id;

  assert (select letzte_aktivitaet from public.deal_activity_status where deal_id = d_id)
    < now() - interval '14 days', 'baseline should be creation date';

  insert into public.activities (company_id, typ, zeitpunkt)
  values (c_id, 'anruf', now() - interval '20 days');
  assert (select letzte_aktivitaet from public.deal_activity_status where deal_id = d_id)
    < now() - interval '14 days', 'old company activity should not reset warning';

  insert into public.activities (deal_id, company_id, typ, zeitpunkt)
  values (d_id, c_id, 'mail', now() - interval '2 days');
  assert (select letzte_aktivitaet from public.deal_activity_status where deal_id = d_id)
    > now() - interval '14 days', 'recent deal activity not counted';
end;
$$;

-- Another owner sees neither duplicates nor activity status of foreign rows.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal2"}', true);
do $$
begin
  assert (select count(*) from public.find_duplicates(p_website => 'beispiel.de')) = 0, 'foreign duplicates visible';
  assert (select count(*) from public.deal_activity_status) = 0, 'foreign deal status visible';
end;
$$;

reset role;
select 'phase2 database tests passed' as result;
rollback;
