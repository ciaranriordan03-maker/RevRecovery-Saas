begin;

-- Preserve the behavior of every existing connection when recovery modes are
-- activated. New connections are initialized by the application with the
-- table default (`off`) and require an explicit mode choice.
insert into public.recovery_account_settings (
  user_id,
  stripe_connection_id,
  stripe_account_id,
  livemode,
  recovery_mode,
  timezone
)
select
  connection.user_id,
  connection.id,
  connection.stripe_account_id,
  coalesce(connection.livemode, false),
  'live',
  'UTC'
from public.stripe_connections as connection
on conflict (stripe_connection_id) do nothing;

create or replace function public.claim_due_recovery_messages(
  requested_claim_token uuid,
  batch_size integer default 25,
  lease_seconds integer default 120
)
returns setof public.recovery_messages
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.recovery_message_attempts (
    recovery_message_id, attempt_number, delivery_generation, claim_token,
    outcome, started_at, finished_at
  )
  select message.id, message.send_attempt_count, message.delivery_generation,
         message.claim_token, 'lease_expired',
         coalesce(message.claimed_at, timezone('utc'::text, now())),
         timezone('utc'::text, now())
  from public.recovery_messages message
  where message.status = 'claimed'
    and message.claim_expires_at < timezone('utc'::text, now())
  on conflict (recovery_message_id, delivery_generation, attempt_number)
  do update set outcome = 'lease_expired', finished_at = excluded.finished_at;

  return query
  with claimable as (
    select message.id
    from public.recovery_messages as message
    join public.recovery_sequences as sequence on sequence.id = message.sequence_id
    join public.failed_payments as payment on payment.id = message.failed_payment_id
    join public.recovery_account_settings as settings
      on settings.stripe_account_id = payment.stripe_account_id
     and settings.livemode = payment.livemode
    where message.status in ('pending', 'scheduled', 'failed_retryable', 'claimed')
      and sequence.status = 'active'
      and settings.recovery_mode in ('test', 'live')
      and coalesce(message.next_attempt_at, message.scheduled_for) <= timezone('utc'::text, now())
      and (message.claim_expires_at is null or message.claim_expires_at < timezone('utc'::text, now()))
    order by coalesce(message.next_attempt_at, message.scheduled_for), message.id
    for update of message skip locked
    limit greatest(batch_size, 1)
  ), claimed as (
    update public.recovery_messages as message
    set status = 'claimed',
        claim_token = requested_claim_token,
        claimed_at = timezone('utc'::text, now()),
        claim_expires_at = timezone('utc'::text, now()) + make_interval(secs => greatest(lease_seconds, 1)),
        last_attempted_at = timezone('utc'::text, now()),
        send_attempt_count = message.send_attempt_count + 1,
        provider_idempotency_key = coalesce(
          message.provider_idempotency_key,
          'recovery-message/' || message.id::text || '/generation/' || message.delivery_generation::text
        )
    from claimable
    where message.id = claimable.id
    returning message.*
  ), attempts as (
    insert into public.recovery_message_attempts (
      recovery_message_id, attempt_number, delivery_generation, claim_token,
      outcome, started_at
    )
    select claimed.id, claimed.send_attempt_count, claimed.delivery_generation,
           requested_claim_token, 'claimed', timezone('utc'::text, now())
    from claimed
    returning recovery_message_id
  )
  select claimed.* from claimed;
end;
$$;

create or replace function public.complete_recovery_message_delivery(
  requested_message_id uuid,
  requested_claim_token uuid,
  requested_outcome text,
  requested_provider_message_id text default null,
  requested_sent_to_email text default null,
  requested_next_attempt_at timestamptz default null,
  requested_error_code text default null,
  requested_error_details jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_message public.recovery_messages%rowtype;
  current_sequence public.recovery_sequences%rowtype;
  previous_case_status text;
  delivery_completed_at timestamptz := timezone('utc'::text, now());
begin
  if requested_outcome not in ('sent', 'failed_retryable', 'failed_terminal') then
    raise exception 'Unsupported recovery delivery outcome';
  end if;

  select * into current_message
  from public.recovery_messages
  where id = requested_message_id
  for update;

  if not found
     or current_message.status <> 'claimed'
     or current_message.claim_token is distinct from requested_claim_token then
    return false;
  end if;

  select * into current_sequence
  from public.recovery_sequences
  where id = current_message.sequence_id
  for update;

  update public.recovery_messages
  set status = requested_outcome,
      provider_message_id = case when requested_outcome = 'sent'
        then coalesce(requested_provider_message_id, provider_message_id) else provider_message_id end,
      provider_accepted_at = case when requested_outcome = 'sent'
        then coalesce(provider_accepted_at, delivery_completed_at) else provider_accepted_at end,
      sent_at = case when requested_outcome = 'sent'
        then coalesce(sent_at, delivery_completed_at) else sent_at end,
      sent_to_email = case when requested_outcome = 'sent'
        then requested_sent_to_email else sent_to_email end,
      next_attempt_at = case when requested_outcome = 'failed_retryable'
        then requested_next_attempt_at else null end,
      terminal_failed_at = case when requested_outcome = 'failed_terminal'
        then delivery_completed_at else null end,
      failure_code = case when requested_outcome like 'failed_%'
        then requested_error_code else null end,
      failure_details = case when requested_outcome like 'failed_%'
        then coalesce(requested_error_details, '{}'::jsonb) else '{}'::jsonb end,
      last_error = case when requested_outcome like 'failed_%'
        then requested_error_code else null end,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null
  where id = requested_message_id;

  update public.recovery_message_attempts
  set outcome = requested_outcome,
      provider_message_id = requested_provider_message_id,
      error_code = requested_error_code,
      error_details = coalesce(requested_error_details, '{}'::jsonb),
      finished_at = delivery_completed_at
  where recovery_message_id = requested_message_id
    and delivery_generation = current_message.delivery_generation
    and attempt_number = current_message.send_attempt_count
    and claim_token = requested_claim_token;

  if requested_outcome = 'sent' then
    update public.recovery_sequences
    set current_step = greatest(current_step, current_message.step_number),
        updated_at = delivery_completed_at
    where id = current_message.sequence_id;

    if not exists (
      select 1 from public.recovery_messages as unfinished_message
      where unfinished_message.sequence_id = current_message.sequence_id
        and unfinished_message.status in (
          'pending', 'scheduled', 'failed_retryable', 'claimed', 'paused'
        )
    ) and exists (
      select 1
      from public.recovery_messages as final_message
      where final_message.sequence_id = current_message.sequence_id
        and final_message.status = 'sent'
        and final_message.step_number = (
          select max(candidate.step_number)
          from public.recovery_messages as candidate
          where candidate.sequence_id = current_message.sequence_id
        )
    ) and current_sequence.status = 'active' then
      select case_status into previous_case_status
      from public.failed_payments
      where id = current_message.failed_payment_id
      for update;

      update public.recovery_sequences
      set status = 'exhausted',
          exhausted_at = delivery_completed_at,
          completed_at = delivery_completed_at,
          terminal_reason = 'final_message_sent',
          updated_at = delivery_completed_at
      where id = current_message.sequence_id
        and status = 'active';

      update public.failed_payments
      set status = 'exhausted',
          recovery_stage = 'exhausted',
          case_status = 'exhausted',
          terminal_at = delivery_completed_at,
          terminal_reason = 'final_message_sent',
          state_version = state_version + 1,
          updated_at = delivery_completed_at
      where id = current_message.failed_payment_id
        and case_status not in ('recovered', 'no_longer_applicable', 'canceled_by_merchant');

      if found and previous_case_status is distinct from 'exhausted' then
        insert into public.recovery_case_transitions (
          failed_payment_id, user_id, from_status, to_status, reason, metadata
        ) values (
          current_message.failed_payment_id, current_message.user_id,
          previous_case_status, 'exhausted', 'final_message_sent',
          jsonb_build_object('recovery_message_id', current_message.id)
        );
      end if;
    end if;
  elsif requested_outcome = 'failed_terminal' and current_sequence.status = 'active' then
    select case_status into previous_case_status
    from public.failed_payments
    where id = current_message.failed_payment_id
    for update;

    update public.recovery_sequences
    set status = 'failed_operationally',
        terminal_reason = coalesce(requested_error_code, 'delivery_failed_terminally'),
        updated_at = delivery_completed_at
    where id = current_message.sequence_id
      and status = 'active';

    update public.failed_payments
    set status = 'failed_operationally',
        recovery_stage = 'failed_operationally',
        case_status = 'failed_operationally',
        terminal_reason = coalesce(requested_error_code, 'delivery_failed_terminally'),
        terminal_at = delivery_completed_at,
        state_version = state_version + 1,
        updated_at = delivery_completed_at
    where id = current_message.failed_payment_id
      and case_status not in ('recovered', 'no_longer_applicable', 'canceled_by_merchant');

    if found and previous_case_status is distinct from 'failed_operationally' then
      insert into public.recovery_case_transitions (
        failed_payment_id, user_id, from_status, to_status, reason, metadata
      ) values (
        current_message.failed_payment_id, current_message.user_id,
        previous_case_status, 'failed_operationally',
        coalesce(requested_error_code, 'delivery_failed_terminally'),
        jsonb_build_object('recovery_message_id', current_message.id)
      );
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.request_recovery_message_replay(
  requested_message_id uuid,
  requested_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  replayed_message public.recovery_messages%rowtype;
begin
  update public.recovery_messages
  set status = 'failed_retryable',
      next_attempt_at = timezone('utc'::text, now()),
      delivery_generation = delivery_generation + 1,
      provider_idempotency_key = null,
      provider_message_id = null,
      provider_accepted_at = null,
      terminal_failed_at = null,
      failure_code = null,
      failure_details = '{}'::jsonb,
      last_error = null,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null,
      replay_requested_at = timezone('utc'::text, now()),
      replay_requested_by = requested_by
  where id = requested_message_id
    and status = 'failed_terminal'
  returning * into replayed_message;

  if not found then
    return false;
  end if;

  update public.recovery_sequences
  set status = 'active', terminal_reason = null, updated_at = timezone('utc'::text, now())
  where id = replayed_message.sequence_id
    and status = 'failed_operationally';

  update public.failed_payments
  set status = 'open',
      recovery_stage = 'active',
      case_status = 'active',
      terminal_reason = null,
      terminal_at = null,
      state_version = state_version + 1,
      updated_at = timezone('utc'::text, now())
  where id = replayed_message.failed_payment_id
    and case_status = 'failed_operationally';

  return true;
end;
$$;

revoke all on function public.claim_due_recovery_messages(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_recovery_messages(uuid, integer, integer) to service_role;
revoke all on function public.complete_recovery_message_delivery(uuid, uuid, text, text, text, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_recovery_message_delivery(uuid, uuid, text, text, text, timestamptz, text, jsonb) to service_role;
revoke all on function public.request_recovery_message_replay(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_recovery_message_replay(uuid, uuid) to service_role;

commit;
