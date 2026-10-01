-- Database tests for phase 5: quote retention, webhook purge on deletion, file rules.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);

update public.settings set firmenname = 'Agentur Beispiel', strasse = 'Hauptstr. 1', plz = '10115', ort = 'Berlin',
  iban = 'DE02120300000000202051', steuernummer = '11/111/11111';

-- Deleting a company keeps sent quotes (detached) and deletes draft quotes.
do $$
declare
  c_id uuid;
  d_id uuid;
  stage uuid;
  sent public.quotes;
  draft_id uuid;
begin
  insert into public.companies (name, plz, ort) values ('Angebot GmbH', '12345', 'Musterstadt') returning id into c_id;
  select id into stage from public.deal_stages where art = 'offen' order by position limit 1;
  insert into public.deals (company_id, stage_id, titel) values (c_id, stage, 'Deal') returning id into d_id;
  insert into public.quotes (deal_id, positionen) values (d_id, '[{"beschreibung":"A","menge":1,"einheit":"Pauschal","einzelpreis":100}]')
  returning * into sent;
  sent := public.finalize_quote(sent.id, '2026-10-01');
  insert into public.quotes (deal_id) values (d_id) returning id into draft_id;

  begin
    delete from public.quotes where id = sent.id;
    assert false, 'sent quote deleted';
  exception when raise_exception then null;
  end;
  begin
    update public.quotes set deal_id = null where id = sent.id;
    update public.quotes set deal_id = d_id where id = sent.id;
    assert false, 'sent quote re-linked';
  exception when raise_exception then null;
  end;

  delete from public.companies where id = c_id;
  assert (select deal_id from public.quotes where id = sent.id) is null, 'sent quote not kept';
  assert (select empfaenger ->> 'name' from public.quotes where id = sent.id) = 'Angebot GmbH', 'snapshot lost';
  assert not exists (select 1 from public.quotes where id = draft_id), 'draft quote kept';
end;
$$;

-- Deleting a contact or company removes logged webhook events that mention it.
do $$
declare
  c_id uuid;
  k_id uuid;
  other_c uuid;
  owner uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into public.companies (name) values ('Hook GmbH') returning id into c_id;
  insert into public.companies (name) values ('Bleibt GmbH') returning id into other_c;
  insert into public.contacts (company_id, vorname, nachname, email) values (c_id, 'Erika', 'Muster', 'erika@hook.example')
  returning id into k_id;
  insert into public.webhook_events (event, payload, status) values
    ('deal.created', jsonb_build_object('contact', jsonb_build_object('id', k_id, 'email', 'erika@hook.example')), 'gesendet'),
    ('deal.created', jsonb_build_object('company', jsonb_build_object('id', c_id)), 'gesendet'),
    ('deal.created', jsonb_build_object('company', jsonb_build_object('id', other_c)), 'gesendet');

  delete from public.contacts where id = k_id;
  assert (select count(*) from public.webhook_events where payload::text like '%erika@hook%') = 0, 'contact event kept';
  assert (select count(*) from public.webhook_events) = 2, 'other events deleted';
  delete from public.companies where id = c_id;
  assert (select count(*) from public.webhook_events) = 1, 'company event kept';
end;
$$;

-- Old finished events are purged by the service role only.
do $$
begin
  begin
    perform public.purge_old_webhook_events(now());
    assert false, 'purge callable by authenticated';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.webhook_events (owner_id, event, payload, status, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'x', '{}', 'gesendet', now() - interval '31 days'),
  ('11111111-1111-1111-1111-111111111111', 'x', '{}', 'ausstehend', now() - interval '31 days');
set local role service_role;
do $$
begin
  assert public.purge_old_webhook_events(now() - interval '30 days') = 1, 'purge count';
  assert (select count(*) from public.webhook_events where event = 'x') = 1, 'pending event purged';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);

-- Files: company derived from deal/project, path must start with the owner id,
-- deleted rows queue their storage object.
do $$
declare
  c_id uuid;
  d_id uuid;
  p_id uuid;
  stage uuid;
  f public.files;
begin
  insert into public.companies (name) values ('Datei GmbH') returning id into c_id;
  select id into stage from public.deal_stages where art = 'offen' order by position limit 1;
  insert into public.deals (company_id, stage_id, titel) values (c_id, stage, 'Deal') returning id into d_id;
  insert into public.projects (company_id, titel) values (c_id, 'Projekt') returning id into p_id;

  insert into public.files (deal_id, name, pfad, groesse)
  values (d_id, 'Vertrag.pdf', '11111111-1111-1111-1111-111111111111/dateien/a-vertrag.pdf', 1000) returning * into f;
  assert f.company_id = c_id, 'company from deal';
  insert into public.files (project_id, name, pfad)
  values (p_id, 'Konzept.pdf', '11111111-1111-1111-1111-111111111111/dateien/b-konzept.pdf') returning * into f;
  assert f.company_id = c_id, 'company from project';

  begin
    insert into public.files (company_id, name, pfad) values (c_id, 'x', '22222222-2222-2222-2222-222222222222/dateien/x');
    assert false, 'foreign path accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.files (company_id, name, pfad, groesse) values (c_id, 'x', '11111111-1111-1111-1111-111111111111/dateien/big', 10485761);
    assert false, 'file over 10 MB accepted';
  exception when check_violation then null;
  end;

  delete from public.companies where id = c_id;
  assert (select count(*) from public.files) = 0, 'files kept';
  assert (select count(*) from public.storage_deletions) = 2, 'storage deletions not queued';
end;
$$;

-- RLS on the deletion queue.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal2"}', true);
do $$
begin
  assert (select count(*) from public.storage_deletions) = 0, 'foreign queue visible';
end;
$$;

rollback;
