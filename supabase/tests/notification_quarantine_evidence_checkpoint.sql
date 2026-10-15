begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role, created_at, updated_at) values
  ('a0000000-0000-0000-0000-000000000001', 'checkpoint-owner@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('a0000000-0000-0000-0000-000000000002', 'checkpoint-reviewer@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.stripe_connections (id, user_id, stripe_account_id, livemode, access_token)
values ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'acct_checkpoint_test', false, 'local-placeholder');

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone, essential_notifications_enabled,
  essential_notifications_delivery_mode
) values (
  'a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001', 'acct_checkpoint_test', false, 'test',
  'checkpoint-owner@example.invalid', 'Europe/Dublin', false, 'disabled'
);

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint, deduplication_key,
  status, recipient_email, occurred_at, cooldown_until, delivery_enabled_snapshot,
  payload, claim_token, claimed_at
) values (
  'a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001', 'attention_digest', 'warning',
  'checkpoint-drill', 'attention_digest:checkpoint-drill:bucket', 'queued',
  'checkpoint-owner@example.invalid', now() - interval '1 hour', now() + interval '23 hours',
  false, '{"drill":"D4z","previewOnly":true}'::jsonb,
  'a4000000-0000-0000-0000-000000000001', now() - interval '30 minutes'
);

insert into public.recovery_notification_delivery_attempts (
  id, event_id, user_id, outcome, reason_code, recipient_email
) values (
  'a5000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', 'claimed', 'authorized_test_notification_claimed',
  'checkpoint-owner@example.invalid'
);

insert into public.recovery_notification_resolution_requests (
  id, user_id, account_settings_id, event_id, reservation_attempt_id,
  requester_id, reviewer_id, status, decision_scope, evidence_summary,
  review_note, requested_at, expires_at, reviewed_at
) values (
  'a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002', 'quarantined', 'quarantine_only',
  'Checkpoint test review.', 'Independent quarantine-only approval.',
  now() - interval '10 minutes', now() + interval '5 minutes', now() - interval '5 minutes'
);

insert into public.recovery_notification_resolution_request_audit (
  request_id, user_id, actor_id, action, decision_scope, evidence_summary, created_at
) values
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'requested', 'quarantine_only', 'Checkpoint test review.', now() - interval '10 minutes'),
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'approved', 'quarantine_only', 'Independent quarantine-only approval.', now() - interval '5 minutes'),
  ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'quarantined', 'quarantine_only', 'Checkpoint applied once.', now());

insert into public.recovery_notification_quarantines (
  id, user_id, account_settings_id, event_id, reservation_attempt_id,
  resolution_request_id, applied_by, decision_scope, evidence_summary, created_at
) values (
  'a7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002', 'quarantine_only', 'Checkpoint applied once.', now()
);

set constraints all immediate;

select is(
  (select count(*)::integer from public.recovery_notification_quarantine_checkpoints where quarantine_id = 'a7000000-0000-0000-0000-000000000001'),
  1, 'a final quarantine creates exactly one evidence checkpoint'
);

select matches(
  (select evidence_fingerprint from public.recovery_notification_quarantine_checkpoints where quarantine_id = 'a7000000-0000-0000-0000-000000000001'),
  '^[0-9a-f]{64}$', 'the checkpoint contains a SHA-256 fingerprint'
);

select is(
  (select canonical_version from public.recovery_notification_quarantine_checkpoints where quarantine_id = 'a7000000-0000-0000-0000-000000000001'),
  1, 'the checkpoint records its canonical format version'
);

select throws_ok(
  $$update public.recovery_notification_quarantine_checkpoints set canonical_version = 1 where quarantine_id = 'a7000000-0000-0000-0000-000000000001'$$,
  'P0001', 'Notification quarantine evidence checkpoints are immutable',
  'checkpoint updates are rejected'
);

select throws_ok(
  $$delete from public.recovery_notification_quarantine_checkpoints where quarantine_id = 'a7000000-0000-0000-0000-000000000001'$$,
  'P0001', 'Notification quarantine evidence checkpoints are immutable',
  'checkpoint deletion is rejected'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts where outcome = 'sent'),
  0, 'checkpoint creation never records delivery or contacts a provider'
);

select * from finish();
rollback;
