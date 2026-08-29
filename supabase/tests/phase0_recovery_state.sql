begin;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '40000000-0000-0000-0000-000000000001',
  'phase0-state@example.invalid',
  'authenticated',
  'authenticated',
  now(),
  now()
);

insert into public.stripe_connections (
  id, user_id, stripe_account_id, access_token, livemode
) values (
  '41000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'acct_phase0_state',
  'encrypted-local-placeholder',
  false
);

do $$
declare
  payment_id uuid;
  sequence_id uuid;
  result_count integer;
begin
  -- invoice.updated may reconcile a known case, but cannot create one.
  perform public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_updated_before_failure', '2026-08-29 10:00:00+00', 'invoice.updated',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', null, null,
    2000, 0, 'eur', 1, null, 'open', 'subscription',
    'subscription_cycle', null, null, null, null, null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"open"}}}'::jsonb
  );

  select count(*) into result_count
  from public.failed_payments
  where stripe_invoice_id = 'in_phase0_primary';
  assert result_count = 0, 'invoice.updated created a recovery case';

  select id into payment_id
  from public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_primary_failed', '2026-08-29 10:01:00+00', 'invoice.payment_failed',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', 'pi_phase0', 'ch_phase0',
    2000, 0, 'eur', 1, '2026-08-30 10:01:00+00', 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'insufficient_funds', 'Declined',
    'active', null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"open"}}}'::jsonb
  );

  assert payment_id is not null, 'invoice.payment_failed did not create a case';
  assert (
    select case_status = 'active'
      and stripe_subscription_id = 'sub_phase0'
      and stripe_payment_intent_id = 'pi_phase0'
      and stripe_charge_id = 'ch_phase0'
      and decline_code = 'insufficient_funds'
    from public.failed_payments where id = payment_id
  ), 'failure context or active case state was not stored';

  select count(*) into result_count
  from public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_primary_failed_duplicate', '2026-08-29 10:01:01+00', 'invoice.payment_failed',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', 'pi_phase0', 'ch_phase0',
    2000, 0, 'eur', 1, null, 'open', 'subscription',
    'subscription_cycle', null, null, null, 'active', null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"open"}}}'::jsonb
  );
  assert result_count = 1, 'duplicate failure did not reconcile the existing case';
  assert (
    select count(*) = 1 from public.failed_payments
    where stripe_invoice_id = 'in_phase0_primary'
  ), 'duplicate failure created more than one case';

  insert into public.recovery_sequences (
    user_id, failed_payment_id, stripe_account_id, stripe_customer_id,
    stripe_invoice_id, status
  ) values (
    '40000000-0000-0000-0000-000000000001', payment_id,
    'acct_phase0_state', 'cus_phase0', 'in_phase0_primary', 'active'
  ) returning id into sequence_id;

  insert into public.recovery_messages (
    sequence_id, failed_payment_id, user_id, message_key, step_number,
    scheduled_for, status
  ) values (
    sequence_id, payment_id, '40000000-0000-0000-0000-000000000001',
    'phase0-step-1', 1, now() + interval '1 day', 'pending'
  );

  assert public.pause_recovery_cases_for_payment_method(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'cus_phase0', 'evt_payment_method', '2026-08-29 10:02:00+00'
  ) = 1, 'payment method update did not pause the case';
  assert (
    select case_status = 'payment_method_updated'
    from public.failed_payments where id = payment_id
  ), 'payment method update incorrectly resolved the case';
  assert (
    select status = 'paused' from public.recovery_messages
    where failed_payment_id = payment_id
  ), 'payment method update did not pause pending outreach';

  perform public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_retry_failed', '2026-08-29 10:03:00+00', 'invoice.payment_failed',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', 'pi_phase0', 'ch_phase0',
    2000, 0, 'eur', 2, null, 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'insufficient_funds', 'Declined again',
    'active', null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"open"}}}'::jsonb
  );
  assert (
    select case_status = 'active' from public.failed_payments where id = payment_id
  ), 'a new failed retry did not resume the case';

  perform public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_primary_paid', '2026-08-29 10:04:00+00', 'invoice.paid',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', 'pi_phase0', 'ch_phase0',
    2000, 2000, 'eur', 2, null, 'paid', 'subscription',
    'subscription_cycle', null, null, null, 'recovered', null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"paid"}}}'::jsonb
  );
  assert (
    select case_status = 'recovered' and recovered_at is not null
    from public.failed_payments where id = payment_id
  ), 'paid event did not recover the case';
  assert (
    select status = 'canceled' from public.recovery_messages
    where failed_payment_id = payment_id
  ), 'paid event did not cancel pending outreach';

  perform public.record_stripe_invoice_event(
    '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
    'evt_late_failure', '2026-08-29 10:05:00+00', 'invoice.payment_failed',
    'in_phase0_primary', 'cus_phase0', 'sub_phase0', 'pi_late', 'ch_late',
    2000, 0, 'eur', 3, null, 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'generic_decline', 'Late failure',
    'active', null,
    '{"data":{"object":{"id":"in_phase0_primary","status":"open"}}}'::jsonb
  );
  assert (
    select case_status = 'recovered'
      and latest_stripe_event_id = 'evt_primary_paid'
      and stripe_payment_intent_id = 'pi_phase0'
    from public.failed_payments where id = payment_id
  ), 'late failure reopened or overwrote a recovered case';
end;
$$;

-- A success received first must suppress a delayed failure for the same invoice.
insert into public.stripe_webhook_events (
  stripe_event_id, stripe_account_id, user_id, event_type, livemode,
  event_created_at, status, payload
) values (
  'evt_second_paid', 'acct_phase0_state',
  '40000000-0000-0000-0000-000000000001', 'invoice.paid', false,
  '2026-08-29 11:01:00+00', 'processed',
  '{"data":{"object":{"id":"in_phase0_paid_first","status":"paid"}}}'::jsonb
);

select public.record_stripe_invoice_event(
  '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', false,
  'evt_second_failed_late', '2026-08-29 11:00:00+00', 'invoice.payment_failed',
  'in_phase0_paid_first', 'cus_phase0_second', 'sub_phase0_second', null, null,
  1000, 0, 'eur', 1, null, 'open', 'subscription',
  'subscription_cycle', null, null, null, 'active', null,
  '{"data":{"object":{"id":"in_phase0_paid_first","status":"open"}}}'::jsonb
);

do $$
begin
  assert (
    select count(*) = 0 from public.failed_payments
    where stripe_invoice_id = 'in_phase0_paid_first'
  ), 'delayed failure created a case after a newer paid event';

  begin
    perform public.record_stripe_invoice_event(
      '40000000-0000-0000-0000-000000000001', 'acct_phase0_state', true,
      'evt_wrong_mode', '2026-08-29 12:00:00+00', 'invoice.payment_failed',
      'in_phase0_wrong_mode', 'cus_wrong_mode', null, null, null,
      500, 0, 'eur', 1, null, 'open', 'standalone', null,
      null, null, null, 'active', null,
      '{"data":{"object":{"id":"in_phase0_wrong_mode","status":"open"}}}'::jsonb
    );
    raise exception 'live event was accepted for a sandbox connection';
  exception
    when others then
      if sqlerrm <> 'Stripe connection or environment mismatch' then
        raise;
      end if;
  end;
end;
$$;

rollback;
