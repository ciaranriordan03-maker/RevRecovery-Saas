begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values ('90000000-0000-0000-0000-000000000001', 'reservation-test@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.stripe_connections (id, user_id, stripe_account_id, livemode, access_token)
values ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'acct_reservation_test', false, 'local-placeholder');

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone, essential_notifications_enabled,
  essential_notifications_delivery_mode, essential_notification_test_recipient,
  essential_notification_test_recipient_approved_at
) values (
  '92000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001', 'acct_reservation_test', false, 'test',
  'reservation-test@example.invalid', 'Europe/Dublin', false, 'disabled',
  'reservation-test@example.invalid', now()
);

insert into public.recovery_sending_domains (user_id, domain, provider_domain_id, status, verified_at)
values ('90000000-0000-0000-0000-000000000001', 'notifications.reservation-test.invalid', 'domain_reservation_test', 'verified', now());

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint, deduplication_key,
  status, recipient_email, occurred_at, cooldown_until, delivery_enabled_snapshot, payload
) values (
  '93000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001', 'attention_digest', 'warning',
  'reservation-drill', 'attention_digest:reservation-drill:bucket', 'queued',
  'reservation-test@example.invalid', now(), now() + interval '24 hours', false,
  '{"drill":"D4i","previewOnly":true}'::jsonb
);

insert into public.recovery_notification_delivery_attempts (event_id, user_id, outcome, reason_code, recipient_email)
values ('93000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'blocked', 'global_disabled', 'reservation-test@example.invalid');

select public.review_notification_test_authorization('90000000-0000-0000-0000-000000000001', 'request', null);
select public.review_notification_test_authorization(
  '90000000-0000-0000-0000-000000000001', 'approve',
  (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001')
);

select throws_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', false
  )$$,
  'P0001', 'The global notification delivery gate is disabled',
  'a disabled global gate blocks reservation'
);

update public.recovery_account_settings
set essential_notifications_enabled = true, essential_notifications_delivery_mode = 'test'
where id = '92000000-0000-0000-0000-000000000001';

update public.recovery_notification_test_authorizations
set requested_at = now() - interval '21 minutes',
    approved_at = now() - interval '20 minutes',
    expires_at = now() - interval '1 minute'
where user_id = '90000000-0000-0000-0000-000000000001';

select throws_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', true
  )$$,
  'P0001', 'Notification test authorization has expired',
  'an expired authorization is rejected'
);

update public.recovery_notification_test_authorizations
set expires_at = now() + interval '15 minutes'
where user_id = '90000000-0000-0000-0000-000000000001';

update public.recovery_notification_events
set recipient_email = 'different-recipient@example.invalid'
where id = '93000000-0000-0000-0000-000000000001';

select throws_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', true
  )$$,
  'P0001', 'Authorization, event, and approved recipient must match exactly',
  'a mismatched event recipient is rejected'
);

update public.recovery_notification_events
set recipient_email = 'reservation-test@example.invalid'
where id = '93000000-0000-0000-0000-000000000001';

select throws_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', true
  )$$,
  'P0001', 'The notification event was recorded while delivery was disabled',
  'a preview-only event cannot be reserved'
);

update public.recovery_notification_events set delivery_enabled_snapshot = true
where id = '93000000-0000-0000-0000-000000000001';

select lives_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', true
  )$$,
  'an eligible event and authorization can be atomically reserved'
);

select is(
  (select status from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
  'consumed', 'the authorization is consumed exactly once'
);

select ok(
  (select claim_token is not null and claimed_at is not null from public.recovery_notification_events where id = '93000000-0000-0000-0000-000000000001'),
  'the event receives an atomic reservation token'
);

select is(
  (select count(*)::integer from public.recovery_notification_test_authorization_audit where user_id = '90000000-0000-0000-0000-000000000001' and action = 'consumed'),
  1, 'consumption is written once to the audit ledger'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts where authorization_id is not null),
  1, 'the claimed attempt is linked to the authorization'
);

select throws_ok(
  $$select public.reserve_authorized_notification_test_delivery(
    '90000000-0000-0000-0000-000000000001',
    (select id from public.recovery_notification_test_authorizations where user_id = '90000000-0000-0000-0000-000000000001'),
    '93000000-0000-0000-0000-000000000001', true
  )$$,
  'P0001', 'Only an approved notification test authorization can be consumed',
  'the same authorization cannot be reused'
);

select is(
  (select sent_at from public.recovery_notification_events where id = '93000000-0000-0000-0000-000000000001'),
  null::timestamptz, 'reservation does not mark the event sent'
);

select is(
  (select provider_message_id from public.recovery_notification_events where id = '93000000-0000-0000-0000-000000000001'),
  null::text, 'reservation does not create a provider message'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts where outcome = 'sent'),
  0, 'reservation never records a sent attempt'
);

select * from finish();
rollback;
