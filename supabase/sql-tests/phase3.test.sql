-- Database tests for phase 3: webhook outbox, claiming, overdue tasks, owner-scoped functions.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

-- Webhook secrets are random per user.
do $$
begin
  assert (select count(distinct webhook_secret) from public.settings) = 2, 'secrets not unique';
  assert (select min(length(webhook_secret)) from public.settings) = 64, 'secret too short';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}', true);

-- Only events with a configured URL are queued.
do $$
declare
  c_id uuid;
  d_id uuid;
begin
  update public.settings set webhook_urls = '{"deal.created": "https://n8n.example.test/created"}';
  insert into public.companies (name) values ('Webhook GmbH') returning id into c_id;
  insert into public.deals (company_id, stage_id, titel)
  select c_id, id, 'Automatisierung' from public.deal_stages where name = 'Neu'
  returning id into d_id;

  assert (select count(*) from public.webhook_events) = 1, 'deal.created not queued';
  assert (select ziel_url from public.webhook_events) = 'https://n8n.example.test/created', 'wrong url';
  assert (select payload #>> '{data,deal,titel}' from public.webhook_events) = 'Automatisierung', 'payload deal';
  assert (select payload #>> '{data,company,name}' from public.webhook_events) = 'Webhook GmbH', 'payload company';
  assert (select payload #>> '{data,stage,name}' from public.webhook_events) = 'Neu', 'payload stage';
  assert (select payload ? 'id' and payload ->> 'event' = 'deal.created' from public.webhook_events), 'payload envelope';
  assert (select payload #> '{data,deal}' ? 'owner_id' from public.webhook_events) = false, 'owner leaked';

  update public.deals set stage_id = (select id from public.deal_stages where name = 'Qualifiziert') where id = d_id;
  assert (select count(*) from public.webhook_events) = 1, 'stage change queued without url';

  update public.settings set webhook_urls = webhook_urls || '{"deal.stage_changed": "https://n8n.example.test/stage", "deal.won": "https://n8n.example.test/won", "deal.lost": " "}';
  update public.deals set stage_id = (select id from public.deal_stages where art = 'gewonnen') where id = d_id;
  assert (select count(*) from public.webhook_events where event = 'deal.stage_changed') = 1, 'stage_changed missing';
  assert (select payload #>> '{data,previous_stage,name}' from public.webhook_events where event = 'deal.stage_changed') = 'Qualifiziert', 'previous stage';
  assert (select count(*) from public.webhook_events where event = 'deal.won') = 1, 'deal.won missing';

  update public.deals set stage_id = (select id from public.deal_stages where art = 'verloren'), verlustgrund = 'Budget' where id = d_id;
  assert (select count(*) from public.webhook_events where event = 'deal.lost') = 0, 'blank url should not queue';

  update public.deals set titel = 'Umbenannt' where id = d_id;
  assert (select count(*) from public.webhook_events) = 4, 'unrelated update queued events';
end;
$$;

-- Users cannot enqueue or claim directly.
do $$
begin
  begin
    perform public.enqueue_webhook('11111111-1111-1111-1111-111111111111', 'deal.created', '{}');
    assert false, 'user could call enqueue_webhook';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.claim_webhook_events();
    assert false, 'user could claim events';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.find_duplicates_for_owner('22222222-2222-2222-2222-222222222222', null, 'webhook.de')) = 0, 'rls bypass via owner param';
end;
$$;

-- Other user sees no foreign events.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal2"}', true);
do $$
begin
  assert (select count(*) from public.webhook_events) = 0, 'foreign webhook events visible';
end;
$$;

-- Service role: claiming, owner-scoped duplicates, overdue tasks.
reset role;
set local role service_role;
do $$
declare
  claimed integer;
  owner1 constant uuid := '11111111-1111-1111-1111-111111111111';
  owner2 constant uuid := '22222222-2222-2222-2222-222222222222';
begin
  select count(*) into claimed from public.claim_webhook_events(owner1, 10);
  assert claimed = 4, format('expected 4 claimed, got %s', claimed);
  assert (select count(*) from public.claim_webhook_events(owner1, 10)) = 0, 'claimed twice';
  assert (select count(*) from public.claim_webhook_events(owner2, 10)) = 0, 'claimed foreign';

  update public.webhook_events set gesperrt_bis = now() - interval '1 second',
    naechster_versuch_am = now() + interval '1 minute' where event = 'deal.won';
  assert (select count(*) from public.claim_webhook_events(owner1, 10)) = 0, 'claimed before retry time';
  assert public.next_webhook_retry(owner1) <= now(), 'next retry should include due events';

  update public.companies set website = 'webhook.de' where name = 'Webhook GmbH';
  assert (select count(*) from public.find_duplicates_for_owner(owner1, null, 'www.webhook.de')) = 1, 'owner duplicate';
  assert (select count(*) from public.find_duplicates_for_owner(owner2, null, 'www.webhook.de')) = 0, 'cross-owner duplicate';

  insert into public.tasks (owner_id, titel, faellig_am, company_id)
  select owner1, 'Nachfassen', current_date - 1, id from public.companies where name = 'Webhook GmbH';
  insert into public.tasks (owner_id, titel, faellig_am) values (owner1, 'Heute', current_date);
  assert public.enqueue_overdue_task_webhooks(current_date) = 0, 'overdue queued without url';
  update public.settings set webhook_urls = webhook_urls || '{"task.overdue": "https://n8n.example.test/task"}' where owner_id = owner1;
  assert public.enqueue_overdue_task_webhooks(current_date) = 1, 'overdue task not queued';
  assert public.enqueue_overdue_task_webhooks(current_date) = 0, 'overdue task queued twice';
  assert (select payload #>> '{data,company,name}' from public.webhook_events where event = 'task.overdue') = 'Webhook GmbH', 'task payload';
end;
$$;

reset role;
select 'phase3 database tests passed' as result;
rollback;
