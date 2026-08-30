begin;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '50000000-0000-0000-0000-000000000001',
  'phase0-delivery@example.invalid',
  'authenticated', 'authenticated', now(), now()
);

insert into public.failed_payments (
  id, user_id, stripe_account_id, stripe_invoice_id, amount_due, currency,
  status, recovery_stage, case_status, last_event_type
) values (
  '51000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'acct_phase0_delivery', 'in_phase0_delivery', 2000, 'eur',
  'open', 'pending', 'active', 'invoice.payment_failed'
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
    select count(*) = 2
    from public.recovery_message_attempts
    where recovery_message_id = '53000000-0000-0000-0000-000000000001'
  ), 'delivery attempt history was not preserved';

  update public.recovery_messages
  set status = 'failed_terminal', terminal_failed_at = now()
  where id = '53000000-0000-0000-0000-000000000001';

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
end;
$$;

rollback;
