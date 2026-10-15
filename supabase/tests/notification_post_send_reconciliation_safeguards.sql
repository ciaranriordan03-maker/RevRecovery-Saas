begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values ('94000000-0000-0000-0000-000000000001', 'reconciliation-test@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.stripe_connections (id, user_id, stripe_account_id, livemode, access_token)
values ('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', 'acct_reconciliation_test', false, 'local-placeholder');

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone
) values (
  '96000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001', 'acct_reconciliation_test', false, 'test',
  'reconciliation-test@example.invalid', 'Europe/Dublin'
);

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint, deduplication_key,
  status, recipient_email, occurred_at, cooldown_until, delivery_enabled_snapshot,
  claim_token, claimed_at, payload
) values (
  '97000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000001', 'attention_digest', 'warning',
  'reconciliation-drill', 'attention_digest:reconciliation-drill:bucket', 'queued',
  'reconciliation-test@example.invalid', now(), now() + interval '24 hours', true,
  '98000000-0000-0000-0000-000000000001', now(), '{"drill":"D4o"}'::jsonb
);

select throws_ok(
  $$select public.record_notification_test_provider_acceptance(
    '97000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000002',
    'provider_message_d4o'
  )$$,
  'P0001', 'Notification test event is not in the exact claimed state',
  'a mismatched claim cannot record provider acceptance'
);

select lives_ok(
  $$select public.record_notification_test_provider_acceptance(
    '97000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000001',
    'provider_message_d4o'
  )$$,
  'the exact claim records provider acceptance'
);

select is(
  (select status from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  'accepted', 'provider acceptance creates a non-resendable intermediate state'
);

select ok(
  (select claim_token is null and claimed_at is null and provider_message_id = 'provider_message_d4o' and provider_accepted_at is not null
   from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  'acceptance clears the claim and preserves provider evidence'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'accepted'),
  1, 'provider acceptance is written once to the attempt ledger'
);

select lives_ok(
  $$select public.record_notification_test_provider_acceptance(
    '97000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000001',
    'provider_message_d4o'
  )$$,
  'recording the same provider acceptance is idempotent'
);

select lives_ok(
  $$select public.finalize_accepted_notification_test_delivery(
    '97000000-0000-0000-0000-000000000001', 'provider_message_d4o'
  )$$,
  'an accepted event can be finalized without contacting the provider again'
);

select ok(
  (select status = 'sent' and sent_at is not null and provider_message_id = 'provider_message_d4o'
   from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  'finalization preserves provider evidence and marks the event sent'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'sent'),
  1, 'finalization writes one sent attempt'
);

select lives_ok(
  $$select public.finalize_accepted_notification_test_delivery(
    '97000000-0000-0000-0000-000000000001', 'provider_message_d4o'
  )$$,
  'repeating finalization is idempotent'
);

select is(
  (select count(*)::integer from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'sent'),
  1, 'idempotent finalization does not duplicate the sent ledger entry'
);

select * from finish();
rollback;
