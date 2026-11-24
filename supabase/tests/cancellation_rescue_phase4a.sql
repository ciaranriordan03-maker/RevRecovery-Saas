begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

do $$
declare
  owner_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
  case_id uuid := gen_random_uuid();
  authorization_id uuid;
  claim_id uuid := gen_random_uuid();
  mailbox text := 'phase4a-test@example.invalid';
  sender text;
  original_window record;
begin
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'phase4a-owner@example.invalid', 'authenticated', 'authenticated'),
           (reviewer_id, 'phase4a-reviewer@example.invalid', 'authenticated', 'authenticated');
  insert into public.stripe_connections (user_id, stripe_account_id, access_token, livemode)
    values (owner_id, 'acct_phase4a', 'test-fixture-not-a-token', false),
           (reviewer_id, 'acct_phase4a_other', 'other-test-fixture-not-a-token', false);
  insert into public.cancellation_rescue_settings (user_id, stripe_account_id, livemode, mode)
    values (owner_id, 'acct_phase4a', false, 'test'),
           (reviewer_id, 'acct_phase4a_other', false, 'test');
  insert into public.recovery_sending_domains (user_id, domain, provider_domain_id, status, verified_at)
    values (owner_id, 'phase4a.example.invalid', 'fixture-domain', 'verified', now()),
           (reviewer_id, 'phase4a-other.example.invalid', 'other-fixture-domain', 'verified', now());
  insert into public.cancellation_cases (
    id, user_id, stripe_account_id, livemode, stripe_customer_id, stripe_subscription_id,
    episode_number, episode_key, status, detected_source, event_created_at,
    cancel_at_period_end, cancel_at, detected_at, subscription_status
  ) values (
    case_id, owner_id, 'acct_phase4a', false, 'cus_phase4a', 'sub_phase4a',
    1, 'phase4a-test-episode', 'shadow', 'stripe_webhook', now(),
    true, now() + interval '1 day', now(), 'trialing'
  );

  assert (select not enabled from public.cancellation_test_email_controls where control_key = 'test_email');
  assert not has_table_privilege('authenticated', 'public.cancellation_test_email_authorizations', 'SELECT');
  assert not has_function_privilege('anon', 'public.reserve_cancellation_test_email(uuid,uuid,text,text)', 'EXECUTE');
  assert not has_table_privilege('service_role', 'public.cancellation_test_email_authorizations', 'UPDATE');

  update public.cancellation_cases set livemode = true where id = case_id;
  assert public.request_cancellation_test_email(case_id, owner_id, mailbox) is null, 'live case rejected';
  update public.cancellation_cases set livemode = false where id = case_id;
  assert public.request_cancellation_test_email(case_id, owner_id, 'one@test.invalid,two@test.invalid') is null;

  authorization_id := public.request_cancellation_test_email(case_id, owner_id, mailbox);
  assert authorization_id is not null;
  assert public.request_cancellation_test_email(case_id, owner_id, mailbox) is null, 'one authorization per case';
  assert not public.approve_cancellation_test_email(authorization_id, owner_id), 'no self-approval';
  assert public.approve_cancellation_test_email(authorization_id, reviewer_id);
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'default gates block reservation';

  update public.cancellation_test_email_controls set enabled = true where control_key = 'test_email';
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'account gate still blocks reservation';
  update public.cancellation_rescue_settings set test_email_enabled = true where user_id = owner_id and not livemode;
  update public.cancellation_rescue_settings set mode = 'shadow' where user_id = owner_id and not livemode;
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'changing the account back to shadow stops dispatch without blocking the settings change';
  update public.cancellation_rescue_settings set mode = 'test' where user_id = owner_id and not livemode;

  update public.cancellation_rescue_settings set test_email_enabled = true where user_id = reviewer_id and not livemode;
  update public.cancellation_cases set user_id = reviewer_id, stripe_account_id = 'acct_phase4a_other' where id = case_id;
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'an approved authorization cannot cross into another eligible test account';
  update public.cancellation_cases set user_id = owner_id, stripe_account_id = 'acct_phase4a' where id = case_id;

  select requested_at, approved_at, expires_at into strict original_window
    from public.cancellation_test_email_authorizations where id = authorization_id;
  update public.cancellation_test_email_authorizations
    set requested_at = now() - interval '5 minutes',
        approved_at = now() - interval '4 minutes',
        expires_at = now() - interval '1 minute'
    where id = authorization_id;
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'expired approval cannot be reserved';
  update public.cancellation_test_email_authorizations
    set requested_at = original_window.requested_at,
        approved_at = original_window.approved_at,
        expires_at = original_window.expires_at
    where id = authorization_id;

  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, 'different@example.invalid', 'cancellation_test_v1')
  ), 'recipient drift blocked';
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'different-copy')
  ), 'fixture drift blocked';

  insert into public.recovery_recipient_suppressions (
    user_id, recipient_email, normalized_recipient_email, reason, provider_event_id, occurred_at
  ) values (owner_id, mailbox, mailbox, 'complained', 'phase4a-fixture', now());
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'suppression added after approval blocks reservation';
  delete from public.recovery_recipient_suppressions where user_id = owner_id;

  update public.recovery_sending_domains set status = 'failed' where user_id = owner_id;
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'unverified sender blocks reservation';
  update public.recovery_sending_domains set status = 'verified' where user_id = owner_id;
  update public.cancellation_cases set status = 'reversed' where id = case_id;
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1')
  ), 'reversal blocks reservation';
  update public.cancellation_cases set status = 'shadow' where id = case_id;

  select sending_domain into sender
    from public.reserve_cancellation_test_email(authorization_id, claim_id, mailbox, 'cancellation_test_v1');
  assert sender = 'phase4a.example.invalid';
  assert not public.complete_cancellation_test_email(authorization_id, gen_random_uuid(), null), 'wrong claim rejected';
  assert not public.revoke_cancellation_test_email(authorization_id), 'reservation cannot be undone';
  assert public.complete_cancellation_test_email(authorization_id, claim_id, null), 'ambiguous outcome recorded';
  assert not public.complete_cancellation_test_email(authorization_id, claim_id, 'replay'), 'cannot overwrite evidence';
  assert not exists (
    select 1 from public.reserve_cancellation_test_email(authorization_id, gen_random_uuid(), mailbox, 'cancellation_test_v1')
  ), 'ambiguous outcome is never retried';
end;
$$;

select pass('Phase 4A test-email approval, isolation, suppression and single-attempt safeguards');
select * from finish();
rollback;
