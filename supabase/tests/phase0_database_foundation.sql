begin;

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  'phase0-local@example.invalid',
  'authenticated',
  'authenticated',
  now(),
  now()
);

insert into public.stripe_connections (
  id,
  user_id,
  stripe_account_id,
  access_token,
  livemode
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'acct_phase0_local',
  'encrypted-local-placeholder',
  false
);

insert into public.recovery_account_settings (
  user_id,
  stripe_connection_id,
  stripe_account_id,
  livemode,
  recovery_mode,
  approved_test_recipient,
  timezone
)
values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'acct_phase0_local',
  false,
  'test',
  'phase0-recipient@example.invalid',
  'Europe/Dublin'
);

do $$
begin
  begin
    insert into public.recovery_account_settings (
      user_id,
      stripe_connection_id,
      stripe_account_id,
      livemode,
      recovery_mode
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'acct_invalid_mode',
      true,
      'unsafe'
    );
    raise exception 'invalid recovery mode was accepted';
  exception
    when check_violation then null;
    when unique_violation then
      raise exception 'recovery-mode check did not run before unrelated uniqueness failure';
  end;
end;
$$;

insert into public.stripe_webhook_events (
  stripe_event_id,
  stripe_account_id,
  user_id,
  event_type,
  livemode,
  payload
)
values (
  'evt_phase0_claim',
  'acct_phase0_local',
  '10000000-0000-0000-0000-000000000001',
  'invoice.payment_failed',
  false,
  '{}'::jsonb
);

do $$
declare
  claimed_count integer;
  completed boolean;
begin
  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000001',
    120
  );
  assert claimed_count = 1, 'first webhook claim must succeed';

  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000002',
    120
  );
  assert claimed_count = 0, 'active webhook lease must prevent a second claim';

  update public.stripe_webhook_events
  set claim_expires_at = now() - interval '1 second'
  where stripe_event_id = 'evt_phase0_claim';

  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000002',
    120
  );
  assert claimed_count = 1, 'expired webhook lease must be reclaimable';

  select public.complete_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000003',
    'processed'
  ) into completed;
  assert not completed, 'a stale claim token must not complete a webhook';

  select public.complete_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000002',
    'processed'
  ) into completed;
  assert completed, 'the active claim token must complete a webhook';

  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_claim',
    '30000000-0000-0000-0000-000000000003',
    120
  );
  assert claimed_count = 0, 'processed webhook must never be reclaimed';

  assert (
    select processing_attempt_count = 2
    from public.stripe_webhook_events
    where stripe_event_id = 'evt_phase0_claim'
  ), 'webhook attempt counter must track successful claims';

  assert (
    select count(*) = 1
    from public.stripe_webhook_attempts attempts
    join public.stripe_webhook_events event on event.id = attempts.webhook_event_id
    where event.stripe_event_id = 'evt_phase0_claim'
      and attempts.outcome = 'lease_expired'
  ), 'reclaiming an expired lease must close the abandoned attempt';

  assert (
    select count(*) = 1
    from public.stripe_webhook_attempts attempts
    join public.stripe_webhook_events event on event.id = attempts.webhook_event_id
    where event.stripe_event_id = 'evt_phase0_claim'
      and attempts.outcome = 'processed'
  ), 'completion must close the active attempt';
end;
$$;

insert into public.stripe_webhook_events (
  stripe_event_id,
  stripe_account_id,
  user_id,
  event_type,
  livemode,
  payload
)
values (
  'evt_phase0_replay',
  'acct_phase0_local',
  '10000000-0000-0000-0000-000000000001',
  'invoice.payment_failed',
  false,
  '{}'::jsonb
);

do $$
declare
  claimed_count integer;
  completed boolean;
  replay_requested boolean;
begin
  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_replay',
    '31000000-0000-0000-0000-000000000001',
    120
  );
  assert claimed_count = 1, 'replay fixture must be claimed';

  select public.complete_stripe_webhook_event(
    'evt_phase0_replay',
    '31000000-0000-0000-0000-000000000001',
    'failed',
    'LOCAL_TEST_FAILURE',
    '{"error_type":"LocalTestError"}'::jsonb,
    now() + interval '15 minutes'
  ) into completed;
  assert completed, 'failed attempt must be persisted';

  select public.request_stripe_webhook_replay(
    'evt_phase0_replay',
    '10000000-0000-0000-0000-000000000001'
  ) into replay_requested;
  assert replay_requested, 'failed webhook must allow a replay request';

  select count(*) into claimed_count
  from public.claim_stripe_webhook_event(
    'evt_phase0_replay',
    '31000000-0000-0000-0000-000000000002',
    120
  );
  assert claimed_count = 1, 'replay request must make the event immediately claimable';
end;
$$;

insert into public.failed_payments (
  id,
  user_id,
  stripe_account_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_invoice_id,
  amount_due,
  currency,
  status,
  recovery_stage,
  last_event_type,
  case_status,
  livemode,
  invoice_kind
)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'acct_phase0_local',
  'cus_phase0_local',
  'sub_phase0_local',
  'in_phase0_local',
  1000,
  'eur',
  'failed',
  'email_1_pending',
  'invoice.payment_failed',
  'active',
  false,
  'subscription'
);

insert into public.recovery_sequences (
  id,
  user_id,
  failed_payment_id,
  stripe_account_id,
  stripe_customer_id,
  stripe_invoice_id,
  status
)
values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'acct_phase0_local',
  'cus_phase0_local',
  'in_phase0_local',
  'active'
);

insert into public.recovery_messages (
  id,
  sequence_id,
  failed_payment_id,
  user_id,
  message_key,
  step_number,
  scheduled_for,
  status
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'phase0-due',
    1,
    now() - interval '1 minute',
    'pending'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'phase0-future',
    2,
    now() + interval '1 day',
    'pending'
  );

do $$
declare
  claimed_count integer;
begin
  select count(*) into claimed_count
  from public.claim_due_recovery_messages(
    '70000000-0000-0000-0000-000000000001',
    25,
    120
  );
  assert claimed_count = 1, 'only the due message should be claimed';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(
    '70000000-0000-0000-0000-000000000002',
    25,
    120
  );
  assert claimed_count = 0, 'active message lease must prevent duplicate claim';

  update public.recovery_messages
  set claim_expires_at = now() - interval '1 second'
  where id = '60000000-0000-0000-0000-000000000001';

  select count(*) into claimed_count
  from public.claim_due_recovery_messages(
    '70000000-0000-0000-0000-000000000002',
    25,
    120
  );
  assert claimed_count = 1, 'expired message lease must be reclaimable';
end;
$$;

do $$
begin
  assert not has_function_privilege(
    'anon',
    'public.claim_stripe_webhook_event(text,uuid,integer)',
    'execute'
  ), 'anon must not execute webhook claims';
  assert not has_function_privilege(
    'authenticated',
    'public.claim_due_recovery_messages(uuid,integer,integer)',
    'execute'
  ), 'authenticated users must not execute delivery claims';
  assert has_function_privilege(
    'service_role',
    'public.claim_stripe_webhook_event(text,uuid,integer)',
    'execute'
  ), 'service role must execute webhook claims';
  assert has_function_privilege(
    'service_role',
    'public.claim_due_recovery_messages(uuid,integer,integer)',
    'execute'
  ), 'service role must execute delivery claims';
  assert not has_function_privilege(
    'authenticated',
    'public.complete_stripe_webhook_event(text,uuid,text,text,jsonb,timestamptz,text)',
    'execute'
  ), 'authenticated users must not complete webhook claims';
  assert not has_function_privilege(
    'authenticated',
    'public.request_stripe_webhook_replay(text,uuid)',
    'execute'
  ), 'authenticated users must not request webhook replays';
  assert has_function_privilege(
    'service_role',
    'public.complete_stripe_webhook_event(text,uuid,text,text,jsonb,timestamptz,text)',
    'execute'
  ), 'service role must complete webhook claims';
end;
$$;

rollback;
