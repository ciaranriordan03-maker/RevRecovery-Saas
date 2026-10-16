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

select '1..15';

insert into auth.users (id, email, aud, role, created_at, updated_at) values
  ('a1000000-0000-0000-0000-000000000001', 'resolution-owner@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('a1000000-0000-0000-0000-000000000002', 'resolution-requester@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('a1000000-0000-0000-0000-000000000003', 'resolution-reviewer@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.stripe_connections (id, user_id, stripe_account_id, livemode, access_token)
values ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'acct_resolution_test', false, 'local-placeholder');

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone
) values (
  'a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001', 'acct_resolution_test', false, 'test',
  'resolution-owner@example.invalid', 'Europe/Dublin'
);

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint, deduplication_key,
  status, recipient_email, occurred_at, cooldown_until, delivery_enabled_snapshot,
  claim_token, claimed_at, payload
) values (
  'a4000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001', 'attention_digest', 'warning',
  'resolution-drill', 'attention_digest:resolution-drill:bucket', 'queued',
  'resolution-owner@example.invalid', now() - interval '30 minutes', now() + interval '24 hours', true,
  'a5000000-0000-0000-0000-000000000001', now() - interval '30 minutes', '{"drill":"D4t"}'::jsonb
);

insert into public.recovery_notification_delivery_attempts (
  id, event_id, user_id, outcome, reason_code, recipient_email
) values (
  'a6000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'claimed', 'single_use_authorization_consumed',
  'resolution-owner@example.invalid'
);

select pg_temp.assert_throws(
  $$select public.request_notification_resolution_review('a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Independent provider evidence checked.', true)$$,
  'Notification delivery gates must remain disabled', 1,
  'a global delivery gate blocks resolution requests'
);

select pg_temp.assert_lives(
  $$select public.request_notification_resolution_review('a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Independent provider evidence checked.', false)$$,
  2, 'a stale reservation can create an audit-only request'
);

select pg_temp.assert_true(
  (select status = 'pending' and decision_scope = 'quarantine_only' and expires_at <= requested_at + interval '15 minutes'
   from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001'),
  3, 'the request is pending, quarantine-only, and short lived'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_resolution_request_audit where action = 'requested'),
  4, 'request creation writes one audit entry'
);

select pg_temp.assert_throws(
  $$select public.request_notification_resolution_review('a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Duplicate request.', false)$$,
  'An active resolution request already exists for this event', 5,
  'duplicate active requests are rejected'
);

select pg_temp.assert_throws(
  format(
    $$select public.review_notification_resolution_request('a1000000-0000-0000-0000-000000000001', %L, 'a1000000-0000-0000-0000-000000000002', 'approve', 'Requester cannot self-review.', false)$$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001')
  ),
  'Resolution reviewer must be different from the requester', 6,
  'the requester cannot approve their own request'
);

select pg_temp.assert_lives(
  format(
    $$select public.review_notification_resolution_request('a1000000-0000-0000-0000-000000000001', %L, 'a1000000-0000-0000-0000-000000000003', 'approve', 'Independent evidence supports quarantine only.', false)$$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001')
  ),
  7, 'a separate reviewer can approve the audit-only request'
);

select pg_temp.assert_true(
  (select status = 'approved' and reviewer_id = 'a1000000-0000-0000-0000-000000000003' and reviewed_at is not null
   from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001'),
  8, 'approval records the independent reviewer'
);

select pg_temp.assert_true(
  (select count(*) = 2 from public.recovery_notification_resolution_request_audit),
  9, 'approval adds exactly one immutable audit entry'
);

select pg_temp.assert_true(
  (select status = 'queued' and claim_token = 'a5000000-0000-0000-0000-000000000001' and provider_message_id is null and sent_at is null
   from public.recovery_notification_events where id = 'a4000000-0000-0000-0000-000000000001'),
  10, 'review does not mutate reservation or delivery state'
);

select pg_temp.assert_true(
  (select outcome = 'claimed' and provider_message_id is null
   from public.recovery_notification_delivery_attempts where id = 'a6000000-0000-0000-0000-000000000001'),
  11, 'review does not rewrite delivery-attempt evidence'
);

select pg_temp.assert_throws(
  format(
    $$select public.review_notification_resolution_request('a1000000-0000-0000-0000-000000000001', %L, 'a1000000-0000-0000-0000-000000000003', 'approve', 'Second approval.', false)$$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001')
  ),
  'Only a pending resolution request can be reviewed', 12,
  'an approved request cannot be reviewed twice'
);

select pg_temp.assert_lives(
  $$select public.request_notification_resolution_review('a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'A second independent review window.', false)$$,
  13, 'a completed request does not prevent a later review window'
);

update public.recovery_notification_resolution_requests
set requested_at = now() - interval '30 minutes', expires_at = now() - interval '15 minutes'
where event_id = 'a4000000-0000-0000-0000-000000000001' and status = 'pending';

select pg_temp.assert_lives(
  format(
    $$select public.review_notification_resolution_request('a1000000-0000-0000-0000-000000000001', %L, 'a1000000-0000-0000-0000-000000000003', 'approve', 'This decision arrived too late.', false)$$,
    (select id from public.recovery_notification_resolution_requests where event_id = 'a4000000-0000-0000-0000-000000000001' and status = 'pending')
  ),
  14, 'an expired request is closed without applying a review decision'
);

select pg_temp.assert_true(
  (select count(*) = 1
   from public.recovery_notification_resolution_request_audit audit
   join public.recovery_notification_resolution_requests request on request.id = audit.request_id
   where request.event_id = 'a4000000-0000-0000-0000-000000000001'
     and request.status = 'expired'
     and request.reviewer_id is null
     and audit.action = 'expired'),
  15, 'expiry is persisted in the audit trail without assigning a reviewer'
);

rollback;
