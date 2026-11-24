begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

do $$
declare
  owner_id uuid := gen_random_uuid();
  second_owner_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
  new_case_ids uuid[] := array[]::uuid[];
  earlier_ids uuid[] := array[]::uuid[];
  inboxes text[] := array['bounce@example.invalid', 'complaint@example.invalid', 'transient@example.invalid'];
  pending_id uuid;
  case_id uuid;
  provider_created_at timestamptz;
begin
  insert into auth.users (id, email, aud, role)
  values (owner_id, 'suppression-owner@example.invalid', 'authenticated', 'authenticated'),
         (second_owner_id, 'suppression-other-owner@example.invalid', 'authenticated', 'authenticated'),
         (reviewer_id, 'suppression-reviewer@example.invalid', 'authenticated', 'authenticated');
  insert into public.stripe_connections (user_id, stripe_account_id, access_token, livemode)
  values (owner_id, 'acct_suppression', 'synthetic-not-a-token', false),
         (second_owner_id, 'acct_suppression_other', 'other-synthetic-not-a-token', false);
  insert into public.recovery_sending_domains (user_id, domain, provider_domain_id, status, verified_at)
  values (owner_id, 'guard.example.invalid', 'synthetic-guard', 'verified', now()),
         (second_owner_id, 'other.example.invalid', 'synthetic-other', 'verified', now());
  insert into public.cancellation_rescue_settings (user_id, stripe_account_id, livemode, mode)
  values (owner_id, 'acct_suppression', false, 'test'),
         (second_owner_id, 'acct_suppression_other', false, 'test');

  for i in 1..10 loop
    insert into public.cancellation_cases (
      user_id, stripe_account_id, livemode, stripe_customer_id, stripe_subscription_id,
      episode_number, episode_key, status, detected_source, event_created_at,
      cancel_at_period_end, cancel_at, detected_at, subscription_status
    ) values (
      case when i = 10 then second_owner_id else owner_id end,
      case when i = 10 then 'acct_suppression_other' else 'acct_suppression' end,
      false, 'cus_synthetic', 'sub_suppression_' || i,
      1, 'suppression-fixture-' || i, 'shadow', 'stripe_webhook', now(),
      true, now() + interval '1 day', now(), 'trialing'
    ) returning id into case_id;
    new_case_ids := array_append(new_case_ids, case_id);
  end loop;

  for i in 1..3 loop
    earlier_ids := array_append(earlier_ids, public.request_cancellation_test_email(new_case_ids[i], owner_id, inboxes[i]));
    assert earlier_ids[i] is not null, 'each synthetic case starts eligible';
    assert public.approve_cancellation_test_email(earlier_ids[i], reviewer_id);
    -- Synthetic history only. The reservation RPC is never enabled.
    update public.cancellation_test_email_authorizations
      set status = 'reserved', claim_token = gen_random_uuid(), reserved_at = clock_timestamp()
      where id = earlier_ids[i];
  end loop;
  pending_id := public.request_cancellation_test_email(new_case_ids[9], owner_id, inboxes[1]);
  assert pending_id is not null, 'same inbox could be requested before the suppression arrived';
  assert exists (select 1 from public.cancellation_test_email_context(new_case_ids[4], inboxes[1])),
    'fresh case is eligible before suppression';
  provider_created_at := clock_timestamp();

  assert public.record_cancellation_test_email_evidence(
    earlier_ids[1], 'msg_guard_hard_bounce', 'guard_bounce', inboxes[1], 'guard.example.invalid',
    provider_created_at, provider_created_at, 'bounced', 'bounced'
  ) = 'recorded';
  assert public.record_cancellation_test_email_evidence(
    earlier_ids[2], 'msg_guard_complaint', 'guard_complaint', inboxes[2], 'guard.example.invalid',
    provider_created_at, provider_created_at, 'complained', 'complained'
  ) = 'recorded';
  assert public.record_cancellation_test_email_evidence(
    earlier_ids[3], 'msg_guard_transient', 'guard_transient', inboxes[3], 'guard.example.invalid',
    provider_created_at, provider_created_at, 'bounced', null
  ) = 'recorded';

  assert public.request_cancellation_test_email(new_case_ids[4], owner_id, inboxes[1]) is null,
    'a hard bounce blocks a fresh case for the same inbox';
  assert public.request_cancellation_test_email(new_case_ids[5], owner_id, ' Complaint@EXAMPLE.INVALID ') is null,
    'a complaint blocks the same inbox after normalization';
  assert not public.approve_cancellation_test_email(pending_id, reviewer_id),
    'a request created before the bounce cannot be approved afterward';
  assert not exists (select 1 from public.cancellation_test_email_context(new_case_ids[9], inboxes[1])),
    'the same eligibility guard used by reservation also blocks the inbox';
  assert public.request_cancellation_test_email(new_case_ids[10], second_owner_id, inboxes[1]) is null,
    'switching cancellation test accounts does not bypass an exact-inbox suppression';

  assert public.record_cancellation_test_email_evidence(
    earlier_ids[1], 'msg_guard_late_delivery', 'guard_bounce', inboxes[1], 'guard.example.invalid',
    provider_created_at, provider_created_at + interval '1 minute', 'delivered', null
  ) = 'recorded';
  assert public.request_cancellation_test_email(new_case_ids[6], owner_id, inboxes[1]) is null,
    'late delivery evidence cannot clear a hard bounce';
  assert public.request_cancellation_test_email(new_case_ids[7], owner_id, inboxes[3]) is not null,
    'a transient bounce alone does not permanently suppress the inbox';
  assert public.request_cancellation_test_email(new_case_ids[8], owner_id, 'different@example.invalid') is not null,
    'a different inbox is not blocked by another inbox suppression';
  assert not exists (select 1 from public.recovery_recipient_suppressions s where s.user_id in (owner_id, second_owner_id)),
    'the test does not affect ordinary recovery suppression';

  assert not exists (select 1 from public.cancellation_test_email_controls where enabled);
  assert not exists (select 1 from public.cancellation_test_action_controls where enabled);
  assert not exists (select 1 from public.cancellation_platform_controls where enabled);
  assert not exists (select 1 from public.cancellation_rescue_settings where test_email_enabled or test_rescue_actions_enabled);
end;
$$;

select pass('cancellation hard bounces and complaints block fresh authorizations for the exact test inbox');
select * from finish();
rollback;
