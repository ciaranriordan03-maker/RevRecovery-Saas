begin;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '50000000-0000-0000-0000-000000000001',
  'phase0-delivery@example.invalid',
  'authenticated', 'authenticated', now(), now()
);

insert into public.failed_payments (
  id, user_id, stripe_account_id, stripe_invoice_id, amount_due, currency,
  status, recovery_stage, case_status, last_event_type, livemode
) values (
  '51000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'acct_phase0_delivery', 'in_phase0_delivery', 2000, 'eur',
  'open', 'pending', 'active', 'invoice.payment_failed', false
);

insert into public.stripe_connections (
  id, user_id, stripe_account_id, livemode, access_token
) values (
  '50500000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'acct_phase0_delivery', false, 'phase0-delivery-placeholder'
);

insert into public.recovery_account_settings (
  user_id, stripe_connection_id, stripe_account_id, livemode, recovery_mode,
  approved_test_recipient, timezone
) values (
  '50000000-0000-0000-0000-000000000001',
  '50500000-0000-0000-0000-000000000001',
  'acct_phase0_delivery', false, 'test',
  'recipient@example.invalid', 'Europe/Dublin'
);

insert into public.recovery_sequences (
  id, user_id, failed_payment_id, stripe_account_id, stripe_invoice_id, status
) values (
  '52000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  'acct_phase0_delivery', 'in_phase0_delivery', 'active'
);

insert into public.recovery_messages (
  id, sequence_id, failed_payment_id, user_id, message_key, step_number,
  scheduled_for, next_attempt_at, status
) values (
  '53000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'phase0-delivery-step-2', 2, now() - interval '1 minute', now() - interval '1 minute', 'pending'
);

do $$
declare
  first_claim uuid := '54000000-0000-0000-0000-000000000001';
  second_claim uuid := '54000000-0000-0000-0000-000000000002';
  claimed_count integer;
begin
  update public.recovery_account_settings
  set recovery_mode = 'paused'
  where stripe_account_id = 'acct_phase0_delivery';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(first_claim, 25, 120);
  assert claimed_count = 0, 'paused account unexpectedly claimed a message';

  update public.recovery_account_settings
  set recovery_mode = 'off'
  where stripe_account_id = 'acct_phase0_delivery';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(first_claim, 25, 120);
  assert claimed_count = 0, 'off account unexpectedly claimed a message';

  update public.recovery_account_settings
  set recovery_mode = 'test'
  where stripe_account_id = 'acct_phase0_delivery';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(first_claim, 25, 120);
  assert claimed_count = 1, 'due message was not claimed';
  assert (
    select status = 'claimed'
      and claim_token = first_claim
      and send_attempt_count = 1
      and provider_idempotency_key = 'recovery-message/53000000-0000-0000-0000-000000000001/generation/1'
    from public.recovery_messages
    where id = '53000000-0000-0000-0000-000000000001'
  ), 'claim metadata or stable provider key was not recorded';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(second_claim, 25, 120);
  assert claimed_count = 0, 'a concurrent worker claimed the leased message';

  assert public.complete_recovery_message_delivery(
    '53000000-0000-0000-0000-000000000001', first_claim,
    'failed_retryable', null, null, now() - interval '1 second',
    'resend_http_503', '{"message":"temporary provider failure"}'::jsonb
  ), 'retryable completion failed';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(second_claim, 25, 120);
  assert claimed_count = 1, 'retryable message was not claimed again';
  assert (
    select send_attempt_count = 2
      and provider_idempotency_key = 'recovery-message/53000000-0000-0000-0000-000000000001/generation/1'
    from public.recovery_messages
    where id = '53000000-0000-0000-0000-000000000001'
  ), 'retry changed the provider idempotency key';

  assert public.complete_recovery_message_delivery(
    '53000000-0000-0000-0000-000000000001', second_claim,
    'sent', 'email_phase0_delivery', 'recipient@example.invalid', null, null, '{}'::jsonb
  ), 'sent completion failed';
  assert (
    select status = 'sent'
      and provider_message_id = 'email_phase0_delivery'
      and sent_at is not null
      and claim_token is null
    from public.recovery_messages
    where id = '53000000-0000-0000-0000-000000000001'
  ), 'sent message was not finalized atomically';
  assert (
    select current_step = 2
    from public.recovery_sequences
    where id = '52000000-0000-0000-0000-000000000001'
  ), 'sent completion did not advance sequence progress atomically';
  assert (
    select status = 'exhausted'
      and terminal_reason = 'final_message_sent'
      and exhausted_at is not null
    from public.recovery_sequences
    where id = '52000000-0000-0000-0000-000000000001'
  ), 'final sent message did not exhaust the sequence';
  assert (
    select case_status = 'exhausted'
      and terminal_reason = 'final_message_sent'
    from public.failed_payments
    where id = '51000000-0000-0000-0000-000000000001'
  ), 'final sent message did not exhaust the recovery case';
  assert (
    select count(*) = 1
    from public.recovery_case_transitions
    where failed_payment_id = '51000000-0000-0000-0000-000000000001'
      and to_status = 'exhausted'
  ), 'exhaustion transition history was not recorded';

  assert (
    select count(*) = 2
    from public.recovery_message_attempts
    where recovery_message_id = '53000000-0000-0000-0000-000000000001'
  ), 'delivery attempt history was not preserved';

  update public.recovery_messages
  set status = 'failed_terminal', terminal_failed_at = now()
  where id = '53000000-0000-0000-0000-000000000001';

  update public.recovery_sequences
  set status = 'failed_operationally'
  where id = '52000000-0000-0000-0000-000000000001';

  update public.failed_payments
  set status = 'failed_operationally',
      recovery_stage = 'failed_operationally',
      case_status = 'failed_operationally'
  where id = '51000000-0000-0000-0000-000000000001';

  assert public.request_recovery_message_replay(
    '53000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001'
  ), 'terminal message replay was not accepted';
  assert (
    select status = 'failed_retryable'
      and delivery_generation = 2
      and provider_idempotency_key is null
      and replay_requested_at is not null
    from public.recovery_messages
    where id = '53000000-0000-0000-0000-000000000001'
  ), 'manual replay did not create a new delivery generation';
  assert (
    select status = 'active'
    from public.recovery_sequences
    where id = '52000000-0000-0000-0000-000000000001'
  ), 'manual replay did not reactivate the operationally failed sequence';
  assert (
    select case_status = 'active'
    from public.failed_payments
    where id = '51000000-0000-0000-0000-000000000001'
  ), 'manual replay did not reactivate the operationally failed case';
end;
$$;

rollback;
