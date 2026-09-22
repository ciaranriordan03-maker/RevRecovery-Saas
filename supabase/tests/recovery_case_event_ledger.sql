begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  (
    '50000000-0000-0000-0000-000000000001',
    'timeline@example.invalid',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'other-timeline@example.invalid',
    'authenticated',
    'authenticated',
    now(),
    now()
  );

insert into public.stripe_connections (
  id, user_id, stripe_account_id, access_token, livemode
) values
  (
    '51000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'acct_timeline_test',
    'encrypted-local-placeholder',
    false
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'acct_timeline_other',
    'encrypted-local-placeholder',
    true
  );

do $$
declare
  payment_id uuid;
  other_payment_id uuid;
  sequence_id uuid;
  message_id uuid;
begin
  select id into payment_id
  from public.record_stripe_invoice_event(
    '50000000-0000-0000-0000-000000000001', 'acct_timeline_test', false,
    'evt_timeline_failed', '2026-09-22 09:00:00+00', 'invoice.payment_failed',
    'in_timeline', 'cus_timeline', 'sub_timeline', 'pi_timeline', 'ch_timeline',
    7900, 0, 'eur', 1, '2026-09-23 09:00:00+00', 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'insufficient_funds', 'Declined',
    'active', null,
    '{"data":{"object":{"id":"in_timeline","status":"open"}}}'::jsonb
  );

  assert (
    select count(*) = 1
    from public.recovery_case_events
    where failed_payment_id = payment_id
      and source = 'stripe'
      and source_event_id = 'evt_timeline_failed'
      and livemode = false
  ), 'Stripe failure was not captured exactly once';

  assert (
    select count(*) = 3
    from public.recovery_case_events
    where failed_payment_id = payment_id
  ), 'Stripe failure plus detected and active transitions were not retained';

  perform public.record_stripe_invoice_event(
    '50000000-0000-0000-0000-000000000001', 'acct_timeline_test', false,
    'evt_timeline_failed', '2026-09-22 09:00:00+00', 'invoice.payment_failed',
    'in_timeline', 'cus_timeline', 'sub_timeline', 'pi_timeline', 'ch_timeline',
    7900, 0, 'eur', 1, '2026-09-23 09:00:00+00', 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'insufficient_funds', 'Declined',
    'active', null,
    '{"data":{"object":{"id":"in_timeline","status":"open"}}}'::jsonb
  );

  assert (
    select count(*) = 1
    from public.recovery_case_events
    where source = 'stripe' and source_event_id = 'evt_timeline_failed'
  ), 'duplicate Stripe delivery created a duplicate timeline event';

  assert (
    select metadata ->> 'currency' = 'eur'
      and (metadata ->> 'amount_due')::bigint = 7900
    from public.recovery_case_events
    where source = 'stripe' and source_event_id = 'evt_timeline_failed'
  ), 'currency or amount facts changed in the timeline projection';

  insert into public.recovery_sequences (
    user_id, failed_payment_id, stripe_account_id, stripe_customer_id,
    stripe_invoice_id, status
  ) values (
    '50000000-0000-0000-0000-000000000001', payment_id,
    'acct_timeline_test', 'cus_timeline', 'in_timeline', 'active'
  ) returning id into sequence_id;

  insert into public.recovery_messages (
    sequence_id, failed_payment_id, user_id, message_key, step_number,
    scheduled_for, status
  ) values (
    sequence_id, payment_id, '50000000-0000-0000-0000-000000000001',
    'email_1', 1, '2026-09-22 10:00:00+00', 'pending'
  ) returning id into message_id;

  assert (
    select count(*) = 1
    from public.recovery_case_events
    where failed_payment_id = payment_id
      and source = 'recovery_message_schedule'
      and event_type = 'recovery_message_scheduled'
  ), 'scheduled message was not captured';

  update public.recovery_messages
  set status = 'sent', sent_at = '2026-09-22 10:01:00+00'
  where id = message_id;

  assert (
    select count(*) = 1
    from public.recovery_case_events
    where failed_payment_id = payment_id
      and source = 'recovery_message_status'
      and event_type = 'recovery_message_sent'
  ), 'sent message was not captured';

  insert into public.recovery_message_events (
    provider, provider_event_id, provider_event_type, event_type,
    provider_message_id, recovery_message_id, user_id, occurred_at
  ) values (
    'resend', 'resend_timeline_delivered', 'email.delivered', 'delivered',
    'provider_timeline_message', message_id,
    '50000000-0000-0000-0000-000000000001', '2026-09-22 10:02:00+00'
  );

  assert (
    select count(*) = 1
    from public.recovery_case_events
    where failed_payment_id = payment_id
      and source = 'provider_message_event'
      and event_type = 'email_delivered'
  ), 'provider delivery was not linked to the case';

  perform public.record_stripe_invoice_event(
    '50000000-0000-0000-0000-000000000001', 'acct_timeline_test', false,
    'evt_timeline_paid', '2026-09-22 11:00:00+00', 'invoice.paid',
    'in_timeline', 'cus_timeline', 'sub_timeline', 'pi_timeline', 'ch_timeline',
    7900, 7900, 'eur', 2, null, 'paid', 'subscription',
    'subscription_cycle', null, null, null, 'recovered', null,
    '{"data":{"object":{"id":"in_timeline","status":"paid"}}}'::jsonb
  );

  perform public.record_stripe_invoice_event(
    '50000000-0000-0000-0000-000000000001', 'acct_timeline_test', false,
    'evt_timeline_late_failure', '2026-09-22 10:30:00+00', 'invoice.payment_failed',
    'in_timeline', 'cus_timeline', 'sub_timeline', 'pi_late', 'ch_late',
    7900, 0, 'eur', 3, null, 'open', 'subscription',
    'subscription_cycle', 'card_declined', 'generic_decline', 'Late failure',
    'active', null,
    '{"data":{"object":{"id":"in_timeline","status":"open"}}}'::jsonb
  );

  assert (
    select case_status = 'recovered' and latest_stripe_event_id = 'evt_timeline_paid'
    from public.failed_payments where id = payment_id
  ), 'out-of-order failure changed the settled case';

  assert not exists (
    select 1 from public.recovery_case_events
    where source = 'stripe' and source_event_id = 'evt_timeline_late_failure'
  ), 'ignored out-of-order failure was incorrectly projected as accepted history';

  select id into other_payment_id
  from public.record_stripe_invoice_event(
    '50000000-0000-0000-0000-000000000002', 'acct_timeline_other', true,
    'evt_timeline_unknown', '2026-09-22 12:00:00+00', 'invoice.payment_failed',
    'in_timeline_other', 'cus_timeline_other', 'sub_timeline_other', null, null,
    4200, 0, 'usd', 1, null, 'open', 'subscription',
    'subscription_cycle', null, null, null, 'active', null,
    '{"data":{"object":{"id":"in_timeline_other","status":"open"}}}'::jsonb
  );

  assert (
    select livemode = true
      and not (metadata ? 'decline_code')
      and not (metadata ? 'failure_code')
    from public.recovery_case_events
    where failed_payment_id = other_payment_id
      and source = 'stripe'
      and source_event_id = 'evt_timeline_unknown'
  ), 'live mode or unknown Stripe facts were invented during projection';

  perform set_config(
    'request.jwt.claim.sub',
    '50000000-0000-0000-0000-000000000001',
    true
  );
  set local role authenticated;

  assert exists (
    select 1 from public.recovery_case_events where failed_payment_id = payment_id
  ), 'tenant could not read its own timeline';

  assert not exists (
    select 1 from public.recovery_case_events where failed_payment_id = other_payment_id
  ), 'tenant could read another tenant timeline';

  reset role;

  begin
    set local role authenticated;
    set local request.jwt.claim.sub = '50000000-0000-0000-0000-000000000001';
    update public.recovery_case_events
    set event_type = 'tampered';
    reset role;
    raise exception 'authenticated user changed immutable timeline history';
  exception
    when insufficient_privilege then
      reset role;
  end;
end;
$$;

select pass('recovery case event ledger captures immutable tenant-scoped timeline facts');
select * from finish();

rollback;
