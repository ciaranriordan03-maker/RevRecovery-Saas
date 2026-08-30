begin;

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
    where message.status in ('pending', 'scheduled', 'failed_retryable', 'claimed')
      and coalesce(message.next_attempt_at, message.scheduled_for) <= timezone('utc'::text, now())
      and (message.claim_expires_at is null or message.claim_expires_at < timezone('utc'::text, now()))
    order by coalesce(message.next_attempt_at, message.scheduled_for), message.id
    for update skip locked
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
    and status = 'failed_terminal';

  return found;
end;
$$;

revoke all on function public.claim_due_recovery_messages(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_recovery_messages(uuid, integer, integer) to service_role;
revoke all on function public.complete_recovery_message_delivery(uuid, uuid, text, text, text, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_recovery_message_delivery(uuid, uuid, text, text, text, timestamptz, text, jsonb) to service_role;
revoke all on function public.request_recovery_message_replay(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_recovery_message_replay(uuid, uuid) to service_role;

commit;
