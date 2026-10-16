begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '70000000-0000-0000-0000-000000000001',
  'notification-test@example.invalid',
  'authenticated', 'authenticated', now(), now()
);

insert into public.stripe_connections (
  id, user_id, stripe_account_id, livemode, access_token
) values (
  '71000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'acct_notification_test', false, 'local-placeholder'
);

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode,
  recovery_mode, approved_test_recipient, timezone
) values (
  '72000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'acct_notification_test', false, 'test',
  'recovery-test@example.invalid', 'Europe/Dublin'
);

select is(
  (select essential_notifications_enabled from public.recovery_account_settings
   where id = '72000000-0000-0000-0000-000000000001'),
  false,
  'notification delivery defaults to disabled'
);

select is(
  (select essential_notifications_delivery_mode from public.recovery_account_settings
   where id = '72000000-0000-0000-0000-000000000001'),
  'disabled',
  'notification delivery mode defaults to disabled'
);

select ok(
  (select essential_notification_test_recipient is null
   from public.recovery_account_settings
   where id = '72000000-0000-0000-0000-000000000001'),
  'notification test recipient has no implicit default'
);

do $$
begin
  begin
    update public.recovery_account_settings
    set essential_notifications_delivery_mode = 'live'
    where id = '72000000-0000-0000-0000-000000000001';
    raise exception 'invalid delivery mode was accepted';
  exception
    when check_violation then null;
  end;
end;
$$;
select pass('delivery mode cannot be changed to live');

insert into public.recovery_notification_events (
  id, user_id, account_settings_id, rule_id, severity, fingerprint,
  deduplication_key, status, recipient_email, occurred_at, cooldown_until,
  delivery_enabled_snapshot, payload
) values
  (
    '73000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    'attention_digest', 'warning', 'local-test-one',
    'attention_digest:local-test-one:bucket', 'queued',
    'notification-test@example.invalid', now(), now() + interval '24 hours',
    true, '{"previewOnly":false}'::jsonb
  ),
  (
    '73000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    'attention_digest', 'warning', 'local-test-two',
    'attention_digest:local-test-two:bucket', 'queued',
    'notification-test@example.invalid', now(), now() + interval '24 hours',
    true, '{"previewOnly":false}'::jsonb
  );

do $$
begin
  begin
    update public.recovery_notification_events
    set claimed_at = now()
    where id = '73000000-0000-0000-0000-000000000001';
    raise exception 'partial claim state was accepted';
  exception
    when check_violation then null;
  end;
end;
$$;
select pass('claim token and timestamp must be written together');

update public.recovery_notification_events
set claim_token = '74000000-0000-0000-0000-000000000001',
    claimed_at = now()
where id = '73000000-0000-0000-0000-000000000001';

do $$
begin
  begin
    update public.recovery_notification_events
    set claim_token = '74000000-0000-0000-0000-000000000001',
        claimed_at = now()
    where id = '73000000-0000-0000-0000-000000000002';
    raise exception 'duplicate claim token was accepted';
  exception
    when unique_violation then null;
  end;
end;
$$;
select pass('claim tokens are exclusive across workers');

do $$
begin
  begin
    update public.recovery_notification_events
    set claim_token = null,
        claimed_at = null,
        delivery_enabled_snapshot = false,
        sent_at = now(),
        status = 'sent'
    where id = '73000000-0000-0000-0000-000000000001';
    raise exception 'sent state without an enabled snapshot was accepted';
  exception
    when check_violation then null;
  end;
end;
$$;
select pass('sent events require an enabled delivery snapshot');

insert into public.recovery_notification_delivery_attempts (
  event_id, user_id, outcome, reason_code, recipient_email
) values (
  '73000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'blocked', 'global_disabled', 'notification-test@example.invalid'
);

select is(
  (select count(*)::integer
   from public.recovery_notification_delivery_attempts
   where event_id = '73000000-0000-0000-0000-000000000001'
     and outcome = 'blocked'
     and reason_code = 'global_disabled'),
  1,
  'blocked delivery attempts are retained in the audit ledger'
);

select * from finish();

rollback;
