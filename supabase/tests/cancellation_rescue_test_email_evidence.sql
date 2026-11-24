begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

do $$
declare
  owner_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
  case_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  auth_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  claims uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  start_at timestamptz := date_trunc('milliseconds', now() - interval '1 minute');
  created_at timestamptz := start_at + interval '1 second';
  event_at timestamptz := start_at + interval '1 hour';
  inbox text := 'phase4c-test@example.invalid';
  domain text := 'phase4c.example.invalid';
begin
  insert into auth.users (id, email, aud, role)
  values (owner_id, 'phase4c-owner@example.invalid', 'authenticated', 'authenticated'),
         (reviewer_id, 'phase4c-reviewer@example.invalid', 'authenticated', 'authenticated');
  for i in 1..4 loop
    insert into public.cancellation_cases (
      id, user_id, stripe_account_id, livemode, stripe_customer_id, stripe_subscription_id,
      episode_number, episode_key, status, detected_source, event_created_at,
      cancel_at_period_end, cancel_at, detected_at, subscription_status
    ) values (
      case_ids[i], owner_id, 'acct_phase4c', false, 'cus_phase4c', 'sub_phase4c_' || i,
      1, 'phase4c-episode-' || i, 'shadow', 'stripe_webhook', start_at,
      true, start_at + interval '1 day', start_at, 'trialing'
    );
    -- Build synthetic historical states without enabling any delivery control.
    insert into public.cancellation_test_email_authorizations (
      id, cancellation_case_id, user_id, stripe_account_id, recipient_email,
      sending_domain, sender_verification_id, sender_verified_at, scheduled_end_at, fixture_version,
      requester_id, requested_at, expires_at, reviewer_id, approved_at, claim_token,
      reserved_at, status
    ) values (
      auth_ids[i], case_ids[i], owner_id, 'acct_phase4c', inbox,
      domain, 'synthetic-sender', start_at, start_at + interval '1 day', 'cancellation_test_v1',
      owner_id, start_at - interval '1 minute', start_at + interval '5 minutes',
      reviewer_id, start_at - interval '1 second',
      case when i < 4 then claims[i] else null end,
      case when i < 4 then start_at else null end,
      case when i < 4 then 'reserved' else 'approved' end
    );
  end loop;

  assert (select not enabled from public.cancellation_test_email_controls where control_key = 'test_email');
  assert not has_table_privilege('authenticated', 'public.cancellation_test_email_evidence', 'SELECT');
  assert not has_table_privilege('service_role', 'public.cancellation_test_email_evidence', 'INSERT');
  assert not has_table_privilege('service_role', 'public.cancellation_test_email_provider_bindings', 'UPDATE');
  assert not has_function_privilege('service_role', 'public.bind_cancellation_test_email_provider(uuid,text)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.record_cancellation_test_email_evidence(uuid,text,text,text,text,timestamptz,timestamptz,text,text)', 'EXECUTE');

  assert public.record_cancellation_test_email_evidence(
    auth_ids[4], 'msg_early', 'provider4', inbox, domain, created_at, event_at, 'sent', null
  ) = 'unmatched', 'an approved but unreserved attempt cannot receive evidence';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_wrong', 'provider1', 'wrong@example.invalid', domain, created_at, event_at, 'sent', null
  ) = 'unmatched', 'signed envelope must match authorized recipient';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_wrong', 'provider1', inbox, 'other.example.invalid', created_at, event_at, 'sent', null
  ) = 'unmatched', 'signed envelope must match authorized sender';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_old', 'provider1', inbox, domain, start_at - interval '1 second', event_at, 'sent', null
  ) = 'unmatched', 'pre-reservation evidence is not accepted';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_late', 'provider1', inbox, domain, start_at + interval '6 minutes', event_at, 'sent', null
  ) = 'unmatched', 'out-of-window provider creation is not accepted';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_bad', 'provider1', inbox, domain, created_at, event_at, 'complained', null
  ) = 'invalid', 'a complaint cannot omit its suppression fact';

  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_delivery', 'provider1', inbox, domain, created_at, event_at, 'delivered', null
  ) = 'recorded', 'evidence after expiry can resolve the reserved attempt';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_delivery', 'provider1', inbox, domain, created_at, event_at, 'delivered', null
  ) = 'duplicate';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[1], 'msg_delivery', 'provider1', inbox, domain, created_at, event_at, 'sent', null
  ) = 'conflict', 'same signed event id cannot rewrite facts';
  assert not public.complete_cancellation_test_email(auth_ids[1], claims[1], 'wrong-provider'),
    'later receipt cannot overwrite first signed binding';
  assert public.complete_cancellation_test_email(auth_ids[1], claims[1], 'provider1');

  assert not public.complete_cancellation_test_email(auth_ids[2], claims[2], 'provider1'),
    'an HTTP receipt cannot take a message already bound to a different attempt';
  assert public.complete_cancellation_test_email(auth_ids[2], claims[2], 'provider2');
  assert public.record_cancellation_test_email_evidence(
    auth_ids[3], 'msg_reused', 'provider2', inbox, domain, created_at, event_at, 'sent', null
  ) = 'conflict', 'an event cannot take a message already bound by an HTTP receipt';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[3], 'msg_delivery', 'would-be-binding', inbox, domain, created_at, event_at, 'delivered', null
  ) = 'conflict', 'an event id cannot be reused across attempts';
  assert not exists (
    select 1 from public.cancellation_test_email_provider_bindings b where b.authorization_id = auth_ids[3]
  ), 'an event-id collision must roll back the provisional binding';

  assert public.complete_cancellation_test_email(auth_ids[3], claims[3], null);
  assert public.record_cancellation_test_email_evidence(
    auth_ids[3], 'msg_complaint', 'provider3', inbox, domain, created_at, event_at, 'complained', 'complained'
  ) = 'recorded', 'an unknown outcome can acquire independent evidence without a resend';
  assert public.record_cancellation_test_email_evidence(
    auth_ids[3], 'msg_delay', 'provider3', inbox, domain, created_at, event_at + interval '1 minute', 'delivery_delayed', null
  ) = 'recorded';
  assert (select delivery_status = 'complained' and suppression_reason = 'complained'
    from public.cancellation_test_email_delivery_evidence e where e.authorization_id = auth_ids[3]),
    'a later event cannot clear a complaint';
  assert (select status = 'outcome_unknown' from public.cancellation_test_email_authorizations where id = auth_ids[3]),
    'delivery evidence does not rewrite the original transport outcome';
  assert not exists (select 1 from public.recovery_recipient_suppressions s where s.user_id = owner_id),
    'cancellation evidence never enters failed-payment suppression';
  assert (select not enabled from public.cancellation_test_email_controls where control_key = 'test_email');
end;
$$;

select pass('durable cancellation test evidence is single-bind, replay-safe, and isolated');
select * from finish();
rollback;
