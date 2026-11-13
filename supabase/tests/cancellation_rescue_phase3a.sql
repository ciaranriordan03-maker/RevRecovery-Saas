begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('73000000-0000-0000-0000-000000000001', 'phase3a@example.invalid', 'authenticated', 'authenticated', now(), now()),
  ('73000000-0000-0000-0000-000000000002', 'phase3a-other@example.invalid', 'authenticated', 'authenticated', now(), now());

insert into public.cancellation_rescue_settings (
  user_id, stripe_account_id, livemode, mode
) values
  ('73000000-0000-0000-0000-000000000001', 'acct_phase3a', false, 'shadow'),
  ('73000000-0000-0000-0000-000000000002', 'acct_phase3a_other', true, 'shadow');

update public.cancellation_platform_controls
set enabled = true where control_key = 'shadow_processing';

do $$
declare
  case_id uuid;
  event_id uuid;
  first_claim boolean;
  equal_lower_claim boolean;
  equal_higher_claim boolean;
  claimed_count integer;
  claimed_job_id uuid;
  completion_ok boolean;
begin
  select public.claim_cancellation_event_order(
    '73000000-0000-0000-0000-000000000001', 'acct_phase3a', false,
    'sub_phase3a', '2026-11-13 19:00:00+00', 'evt_b'
  ) into first_claim;
  select public.claim_cancellation_event_order(
    '73000000-0000-0000-0000-000000000001', 'acct_phase3a', false,
    'sub_phase3a', '2026-11-13 19:00:00+00', 'evt_a'
  ) into equal_lower_claim;
  select public.claim_cancellation_event_order(
    '73000000-0000-0000-0000-000000000001', 'acct_phase3a', false,
    'sub_phase3a', '2026-11-13 19:00:00+00', 'evt_c'
  ) into equal_higher_claim;
  assert first_claim and not equal_lower_claim and equal_higher_claim,
    'same-timestamp events must use deterministic source-id ordering';

  perform public.record_cancellation_subscription_event(
    requested_user_id => '73000000-0000-0000-0000-000000000001',
    requested_stripe_account_id => 'acct_phase3a', requested_livemode => false,
    requested_stripe_customer_id => 'cus_repair', requested_stripe_subscription_id => 'sub_repair',
    requested_source => 'reconciliation', requested_source_event_id => 'reconcile_scheduled',
    requested_event_type => 'customer.subscription.updated',
    requested_event_created_at => '2026-11-13 19:01:00+00',
    requested_cancel_at_period_end => true, requested_cancel_at => null,
    requested_canceled_at => '2026-11-13 19:01:00+00',
    requested_current_period_end => '2026-11-20 19:01:00+00',
    requested_subscription_status => 'active', requested_currency => 'eur',
    requested_recurring_value_cents => 7900, requested_recurring_interval => 'month',
    requested_recurring_interval_count => 1,
    requested_recurring_value_source => 'subscription_items_list_price',
    requested_cancellation_reason => null, requested_cancellation_feedback => null,
    requested_cancellation_comment => null, requested_latest_payload => '{"id":"sub_repair"}'::jsonb
  );
  perform public.record_cancellation_subscription_event(
    requested_user_id => '73000000-0000-0000-0000-000000000001',
    requested_stripe_account_id => 'acct_phase3a', requested_livemode => false,
    requested_stripe_customer_id => 'cus_repair', requested_stripe_subscription_id => 'sub_repair',
    requested_source => 'reconciliation', requested_source_event_id => 'reconcile_reversed',
    requested_event_type => 'customer.subscription.updated',
    requested_event_created_at => '2026-11-13 19:02:00+00',
    requested_cancel_at_period_end => false, requested_cancel_at => null,
    requested_canceled_at => null,
    requested_current_period_end => '2026-11-20 19:01:00+00',
    requested_subscription_status => 'active', requested_currency => 'eur',
    requested_recurring_value_cents => 7900, requested_recurring_interval => 'month',
    requested_recurring_interval_count => 1,
    requested_recurring_value_source => 'subscription_items_list_price',
    requested_cancellation_reason => null, requested_cancellation_feedback => null,
    requested_cancellation_comment => null, requested_latest_payload => '{"id":"sub_repair"}'::jsonb
  );
  assert (select status = 'reversed' from public.cancellation_cases
    where stripe_subscription_id = 'sub_repair' and livemode = false),
    'reconciliation must repair a missed cancellation reversal';

  -- Exact source replay remains idempotent.
  perform public.record_cancellation_subscription_event(
    requested_user_id => '73000000-0000-0000-0000-000000000001',
    requested_stripe_account_id => 'acct_phase3a', requested_livemode => false,
    requested_stripe_customer_id => 'cus_repair', requested_stripe_subscription_id => 'sub_repair',
    requested_source => 'reconciliation', requested_source_event_id => 'reconcile_reversed',
    requested_event_type => 'customer.subscription.updated',
    requested_event_created_at => '2026-11-13 19:02:00+00',
    requested_cancel_at_period_end => false, requested_cancel_at => null,
    requested_canceled_at => null, requested_current_period_end => '2026-11-20 19:01:00+00',
    requested_subscription_status => 'active', requested_currency => 'eur',
    requested_recurring_value_cents => 7900, requested_recurring_interval => 'month',
    requested_recurring_interval_count => 1,
    requested_recurring_value_source => 'subscription_items_list_price',
    requested_cancellation_reason => null, requested_cancellation_feedback => null,
    requested_cancellation_comment => null, requested_latest_payload => '{"id":"sub_repair"}'::jsonb
  );
  assert (select count(*) = 1 from public.cancellation_case_events
    where source_event_id = 'reconcile_reversed'),
    'replayed reconciliation source must not duplicate evidence';

  perform public.record_cancellation_subscription_event(
    requested_user_id => '73000000-0000-0000-0000-000000000002',
    requested_stripe_account_id => 'acct_phase3a_other', requested_livemode => true,
    requested_stripe_customer_id => 'cus_live', requested_stripe_subscription_id => 'sub_same_external_id',
    requested_source => 'reconciliation', requested_source_event_id => 'reconcile_live',
    requested_event_type => 'customer.subscription.updated',
    requested_event_created_at => '2026-11-13 19:03:00+00',
    requested_cancel_at_period_end => true, requested_cancel_at => null,
    requested_canceled_at => '2026-11-13 19:03:00+00',
    requested_current_period_end => '2026-11-20 19:03:00+00',
    requested_subscription_status => 'active', requested_currency => 'usd',
    requested_recurring_value_cents => 9900, requested_recurring_interval => 'month',
    requested_recurring_interval_count => 1,
    requested_recurring_value_source => 'subscription_items_list_price',
    requested_cancellation_reason => null, requested_cancellation_feedback => null,
    requested_cancellation_comment => null, requested_latest_payload => '{"id":"sub_same_external_id"}'::jsonb
  );
  assert exists (select 1 from public.cancellation_cases
    where user_id = '73000000-0000-0000-0000-000000000002' and livemode = true),
    'live-mode evidence must remain in its own tenant/environment partition';

  insert into public.cancellation_cases (
    user_id, stripe_account_id, livemode, stripe_customer_id,
    stripe_subscription_id, episode_number, episode_key, status,
    detected_source, event_created_at, cancel_at_period_end,
    current_period_end, detected_at
  ) values (
    '73000000-0000-0000-0000-000000000001', 'acct_phase3a', false,
    'cus_phase3a', 'sub_phase3a', 1, 'episode_phase3a', 'shadow',
    'reconciliation', now(), true, now() + interval '7 days', now()
  ) returning id into case_id;

  insert into public.cancellation_case_events (
    user_id, cancellation_case_id, stripe_account_id, livemode,
    stripe_subscription_id, source, source_event_id, event_type,
    transition, next_status, occurred_at
  ) values (
    '73000000-0000-0000-0000-000000000001', case_id, 'acct_phase3a', false,
    'sub_phase3a', 'reconciliation', 'reconcile_phase3a',
    'customer.subscription.updated', 'cancellation_scheduled', 'shadow', now()
  ) returning id into event_id;

  assert (select count(*) = 1 from public.cancellation_projection_outbox
    where source_case_event_id = event_id),
    'case event and projection work must be committed transactionally';

  select count(*) into claimed_count
  from public.claim_cancellation_projection_jobs(
    10, '74000000-0000-0000-0000-000000000001', 120, 8
  );
  assert claimed_count >= 1, 'pending projections must be claimable';

  select count(*) into claimed_count
  from public.claim_cancellation_projection_jobs(
    10, '74000000-0000-0000-0000-000000000002', 120, 8
  );
  assert claimed_count = 0, 'active projection lease must prevent concurrent claim';

  select id into claimed_job_id
  from public.cancellation_projection_outbox
  where claim_token = '74000000-0000-0000-0000-000000000001'
  order by created_at
  limit 1;
  update public.cancellation_projection_outbox
  set processing_attempt_count = 8
  where id = claimed_job_id;
  select public.complete_cancellation_projection_job(
    claimed_job_id, '74000000-0000-0000-0000-000000000001',
    'failed', 'LOCAL_TEST_FAILURE', now() + interval '15 minutes', 8
  ) into completion_ok;
  assert completion_ok and (
    select status = 'dead_letter' from public.cancellation_projection_outbox
    where id = claimed_job_id
  ), 'projection retries must dead-letter at the configured attempt ceiling';

  update public.cancellation_platform_controls
  set enabled = false where control_key = 'shadow_processing';
  update public.cancellation_projection_outbox
  set status = 'pending', claim_token = null, claim_expires_at = null
  where status = 'processing';
  select count(*) into claimed_count
  from public.claim_cancellation_projection_jobs(
    10, '74000000-0000-0000-0000-000000000003', 120, 8
  );
  assert claimed_count = 0, 'platform kill switch must prevent projection claims';
  update public.cancellation_platform_controls
  set enabled = true where control_key = 'shadow_processing';

  update public.cancellation_rescue_settings
  set shadow_processing_enabled = false;
  select count(*) into claimed_count
  from public.claim_cancellation_projection_jobs(
    10, '74000000-0000-0000-0000-000000000004', 120, 8
  );
  assert claimed_count = 0, 'account kill switch must prevent projection claims';
  update public.cancellation_rescue_settings
  set shadow_processing_enabled = true;

  insert into public.stripe_webhook_events (
    stripe_event_id, stripe_account_id, user_id, event_type, livemode,
    payload, status, processing_attempt_count
  ) values (
    'evt_phase3a_exhausted', 'acct_phase3a',
    '73000000-0000-0000-0000-000000000001',
    'customer.subscription.updated', false, '{}'::jsonb, 'failed', 8
  );
  perform public.dead_letter_exhausted_stripe_webhooks(8);
  assert (select dead_lettered_at is not null and next_attempt_at is null
    from public.stripe_webhook_events
    where stripe_event_id = 'evt_phase3a_exhausted'),
    'exhausted webhook retries must be dead-lettered';

  insert into public.cancellation_reconciliation_runs (
    user_id, stripe_account_id, livemode, status, cursor, pages_processed
  ) values (
    '73000000-0000-0000-0000-000000000001', 'acct_phase3a', false,
    'processing', 'sub_page_100', 1
  );
  assert (select cursor = 'sub_page_100' and pages_processed = 1
    from public.cancellation_reconciliation_runs
    where user_id = '73000000-0000-0000-0000-000000000001'),
    'reconciliation cursor must persist for resumable processing';

  perform set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000002', true);
  set local role authenticated;
  assert not exists (
    select 1 from public.cancellation_reconciliation_runs
    where user_id = '73000000-0000-0000-0000-000000000001'
  ), 'tenant must not read another tenant reconciliation state';
  reset role;
end;
$$;

select pass('phase 3A ordering, outbox leases, and tenant isolation hold');
select * from finish();

rollback;
