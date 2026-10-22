begin;

create or replace function pg_temp.assert_true(condition boolean, test_number integer, description text)
returns text language plpgsql as $$
begin
  if condition is not true then raise exception 'not ok % - %', test_number, description; end if;
  return format('ok %s - %s', test_number, description);
end;
$$;

create or replace function pg_temp.assert_lives(statement text, test_number integer, description text)
returns text language plpgsql as $$
begin
  execute statement;
  return format('ok %s - %s', test_number, description);
exception when others then
  raise exception 'not ok % - %: %', test_number, description, sqlerrm;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, expected_message text, test_number integer, description text)
returns text language plpgsql as $$
begin
  execute statement;
  raise exception 'not ok % - %: statement did not throw', test_number, description;
exception when others then
  if sqlerrm = expected_message then return format('ok %s - %s', test_number, description); end if;
  raise exception 'not ok % - %: expected %, received %', test_number, description, expected_message, sqlerrm;
end;
$$;

select '1..14';

insert into auth.users (id, email, aud, role, created_at, updated_at) values
  ('b1000000-0000-0000-0000-000000000001', 'quarantine-owner@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-0000-0000-000000000002', 'quarantine-requester@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-0000-0000-000000000003', 'quarantine-reviewer@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.stripe_connections (id, user_id, stripe_account_id, livemode, access_token)
values ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'acct_quarantine_test', false, 'local-placeholder');

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone
) values (
  'b3000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001', 'acct_quarantine_test', false, 'test',
  'quarantine-owner@example.invalid', 'Europe/Dublin'
);

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint, deduplication_key,
  status, recipient_email, occurred_at, cooldown_until, delivery_enabled_snapshot,
  claim_token, claimed_at, payload
) values (
  'b4000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000001', 'attention_digest', 'warning',
  'quarantine-drill', 'attention_digest:quarantine-drill:bucket', 'queued',
  'quarantine-owner@example.invalid', now() - interval '30 minutes', now() + interval '24 hours', true,
  'b5000000-0000-0000-0000-000000000001', now() - interval '30 minutes', '{"drill":"D4v"}'::jsonb
);

insert into public.recovery_notification_delivery_attempts (
  id, event_id, user_id, outcome, reason_code, recipient_email
) values (
  'b6000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001', 'claimed', 'single_use_authorization_consumed',
  'quarantine-owner@example.invalid'
);

select public.request_notification_resolution_review(
  'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
  'Stale reservation has no provider evidence.', false
);

select public.review_notification_resolution_request(
  'b1000000-0000-0000-0000-000000000001',
  (select id from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001'),
  'b1000000-0000-0000-0000-000000000003', 'approve',
  'Independent review approves quarantine only.', false
);

select pg_temp.assert_throws(
  format($sql$select public.apply_notification_resolution_quarantine(
    'b1000000-0000-0000-0000-000000000001', %L, 'b1000000-0000-0000-0000-000000000003',
    'Apply reviewed quarantine.', true)$sql$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001')),
  'Notification delivery gates must remain disabled', 1,
  'the global delivery gate blocks quarantine'
);

select pg_temp.assert_throws(
  format($sql$select public.apply_notification_resolution_quarantine(
    'b1000000-0000-0000-0000-000000000001', %L, 'b1000000-0000-0000-0000-000000000002',
    'Requester must not apply quarantine.', false)$sql$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001')),
  'Only the independent reviewer can apply the approved quarantine', 2,
  'the requester cannot apply the quarantine'
);

select pg_temp.assert_lives(
  format($sql$select public.apply_notification_resolution_quarantine(
    'b1000000-0000-0000-0000-000000000001', %L, 'b1000000-0000-0000-0000-000000000003',
    'Reviewer applied quarantine after confirming no provider contact.', false)$sql$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001')),
  3, 'the independent reviewer can atomically quarantine eligible evidence'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_quarantines where event_id = 'b4000000-0000-0000-0000-000000000001'),
  4, 'exactly one quarantine record is created'
);

select pg_temp.assert_true(
  (select status = 'quarantined' from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001'),
  5, 'the approved request is consumed as quarantined'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_resolution_request_audit where action = 'quarantined'),
  6, 'quarantine appends one immutable audit entry'
);

select pg_temp.assert_true(
  (select status = 'queued' and claim_token = 'b5000000-0000-0000-0000-000000000001' and provider_message_id is null and sent_at is null
   from public.recovery_notification_events where id = 'b4000000-0000-0000-0000-000000000001'),
  7, 'the original reservation evidence is preserved'
);

select pg_temp.assert_true(
  (select outcome = 'claimed' and provider_message_id is null
   from public.recovery_notification_delivery_attempts where id = 'b6000000-0000-0000-0000-000000000001'),
  8, 'the original delivery-attempt evidence is preserved'
);

select pg_temp.assert_lives(
  format($sql$select public.apply_notification_resolution_quarantine(
    'b1000000-0000-0000-0000-000000000001', %L, 'b1000000-0000-0000-0000-000000000003',
    'Idempotent repeat.', false)$sql$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'b4000000-0000-0000-0000-000000000001')),
  9, 'repeating the exact transition is idempotent'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_quarantines),
  10, 'idempotency does not duplicate quarantine records'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_resolution_request_audit where action = 'quarantined'),
  11, 'idempotency does not duplicate audit records'
);

select pg_temp.assert_throws(
  $$update public.recovery_notification_events set last_error = 'retry' where id = 'b4000000-0000-0000-0000-000000000001'$$,
  'A quarantined notification event is immutable', 12,
  'a quarantined event cannot be rewritten for retry'
);

select pg_temp.assert_throws(
  $$insert into public.recovery_notification_delivery_attempts (event_id, user_id, outcome, reason_code, recipient_email)
    values ('b4000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'claimed', 'retry', 'quarantine-owner@example.invalid')$$,
  'A quarantined notification event cannot record another delivery attempt', 13,
  'a quarantined event cannot create another delivery attempt'
);

select pg_temp.assert_true(
  not exists (
    select 1 from public.recovery_notification_events
    where id = 'b4000000-0000-0000-0000-000000000001'
      and (provider_message_id is not null or provider_accepted_at is not null or sent_at is not null)
  ),
  14, 'no provider or delivery evidence was created'
);

rollback;
