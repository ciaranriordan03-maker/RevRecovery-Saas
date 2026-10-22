begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '80000000-0000-0000-0000-000000000001',
  'authorization-test@example.invalid',
  'authenticated', 'authenticated', now(), now()
);

insert into public.stripe_connections (
  id, user_id, stripe_account_id, livemode, access_token
) values (
  '81000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'acct_authorization_test', false, 'local-placeholder'
);

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode,
  recovery_mode, approved_test_recipient, timezone,
  essential_notifications_enabled, essential_notifications_delivery_mode,
  essential_notification_test_recipient, essential_notification_test_recipient_approved_at
) values (
  '82000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'acct_authorization_test', false, 'test',
  'authorization-test@example.invalid', 'Europe/Dublin',
  false, 'disabled', 'authorization-test@example.invalid', now()
);

insert into public.recovery_sending_domains (
  user_id, domain, provider_domain_id, status, verified_at
) values (
  '80000000-0000-0000-0000-000000000001',
  'notifications.authorization-test.invalid', 'domain_authorization_test', 'verified', now()
);

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint,
  deduplication_key, status, recipient_email, occurred_at, cooldown_until,
  delivery_enabled_snapshot, payload
) values (
  '83000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  'attention_digest', 'warning', 'authorization-drill',
  'attention_digest:authorization-drill:bucket', 'queued',
  'authorization-test@example.invalid', now(), now() + interval '24 hours',
  false, '{"drill":"D4i","previewOnly":true}'::jsonb
);

insert into public.recovery_notification_delivery_attempts (
  event_id, user_id, outcome, reason_code, recipient_email
) values (
  '83000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'blocked', 'global_disabled', 'authorization-test@example.invalid'
);

select lives_ok(
  $$select public.review_notification_test_authorization(
    '80000000-0000-0000-0000-000000000001', 'request', null
  )$$,
  'a one-time authorization can be requested only after all safeguards pass'
);

select is(
  (select status from public.recovery_notification_test_authorizations
   where user_id = '80000000-0000-0000-0000-000000000001'),
  'pending',
  'a new authorization starts pending'
);

select is(
  (select count(*)::integer from public.recovery_notification_test_authorization_audit
   where user_id = '80000000-0000-0000-0000-000000000001' and action = 'requested'),
  1,
  'the request is written to the audit ledger'
);

select throws_ok(
  $$select public.review_notification_test_authorization(
    '80000000-0000-0000-0000-000000000001', 'request', null
  )$$,
  'P0001',
  'An active notification test authorization already exists',
  'a second active authorization is rejected'
);

select lives_ok(
  $$select public.review_notification_test_authorization(
    '80000000-0000-0000-0000-000000000001',
    'approve',
    (select id from public.recovery_notification_test_authorizations
     where user_id = '80000000-0000-0000-0000-000000000001')
  )$$,
  'the exact pending authorization can be approved separately'
);

select is(
  (select status from public.recovery_notification_test_authorizations
   where user_id = '80000000-0000-0000-0000-000000000001'),
  'approved',
  'separate approval changes only the authorization state'
);

select ok(
  (select expires_at <= timezone('utc'::text, now()) + interval '16 minutes'
   from public.recovery_notification_test_authorizations
   where user_id = '80000000-0000-0000-0000-000000000001'),
  'approved authorization expires within fifteen minutes'
);

select is(
  (select count(*)::integer from public.recovery_notification_test_authorization_audit
   where user_id = '80000000-0000-0000-0000-000000000001' and action = 'approved'),
  1,
  'separate approval is written to the audit ledger'
);

select ok(
  (select not essential_notifications_enabled
      and essential_notifications_delivery_mode = 'disabled'
   from public.recovery_account_settings
   where id = '82000000-0000-0000-0000-000000000001'),
  'authorization never enables account delivery'
);

select * from finish();

rollback;
