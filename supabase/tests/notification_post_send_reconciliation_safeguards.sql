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

select '1..11';

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

select pg_temp.assert_throws(
  $$select public.record_notification_test_provider_acceptance('97000000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000002', 'provider_message_d4o')$$,
  'Notification test event is not in the exact claimed state', 1,
  'a mismatched claim cannot record provider acceptance'
);

select pg_temp.assert_lives(
  $$select public.record_notification_test_provider_acceptance('97000000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'provider_message_d4o')$$,
  2, 'the exact claim records provider acceptance'
);

select pg_temp.assert_true(
  (select status = 'accepted' from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  3, 'provider acceptance creates a non-resendable intermediate state'
);

select pg_temp.assert_true(
  (select claim_token is null and claimed_at is null and provider_message_id = 'provider_message_d4o' and provider_accepted_at is not null
   from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  4, 'acceptance clears the claim and preserves provider evidence'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'accepted'),
  5, 'provider acceptance is written once to the attempt ledger'
);

select pg_temp.assert_lives(
  $$select public.record_notification_test_provider_acceptance('97000000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'provider_message_d4o')$$,
  6, 'recording the same provider acceptance is idempotent'
);

select pg_temp.assert_lives(
  $$select public.finalize_accepted_notification_test_delivery('97000000-0000-0000-0000-000000000001', 'provider_message_d4o')$$,
  7, 'an accepted event can be finalized without contacting the provider again'
);

select pg_temp.assert_true(
  (select status = 'sent' and sent_at is not null and provider_message_id = 'provider_message_d4o'
   from public.recovery_notification_events where id = '97000000-0000-0000-0000-000000000001'),
  8, 'finalization preserves provider evidence and marks the event sent'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'sent'),
  9, 'finalization writes one sent attempt'
);

select pg_temp.assert_lives(
  $$select public.finalize_accepted_notification_test_delivery('97000000-0000-0000-0000-000000000001', 'provider_message_d4o')$$,
  10, 'repeating finalization is idempotent'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.recovery_notification_delivery_attempts
   where event_id = '97000000-0000-0000-0000-000000000001' and outcome = 'sent'),
  11, 'idempotent finalization does not duplicate the sent ledger entry'
);

rollback;
