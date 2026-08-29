begin;

alter table public.stripe_webhook_events
  add column if not exists replay_requested_at timestamptz,
  add column if not exists replay_requested_by uuid references auth.users(id) on delete set null;

create or replace function public.claim_stripe_webhook_event(
  requested_event_id text,
  requested_claim_token uuid,
  lease_seconds integer default 120
)
returns setof public.stripe_webhook_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_event public.stripe_webhook_events%rowtype;
begin
  update public.stripe_webhook_events as event
  set status = 'processing',
      processing_attempt_count = event.processing_attempt_count + 1,
      first_attempted_at = coalesce(event.first_attempted_at, timezone('utc'::text, now())),
      last_attempted_at = timezone('utc'::text, now()),
      claim_token = requested_claim_token,
      claimed_at = timezone('utc'::text, now()),
      claim_expires_at = timezone('utc'::text, now()) + make_interval(secs => greatest(lease_seconds, 1)),
      error_message = null,
      last_error_code = null,
      last_error_details = '{}'::jsonb,
      ignored_reason = null
  where event.stripe_event_id = requested_event_id
    and (
      (event.status in ('received', 'failed') and (event.next_attempt_at is null or event.next_attempt_at <= timezone('utc'::text, now())))
      or (event.status = 'processing' and event.claim_expires_at < timezone('utc'::text, now()))
    )
  returning event.* into claimed_event;

  if found then
    update public.stripe_webhook_attempts as attempt
    set outcome = 'lease_expired',
        finished_at = timezone('utc'::text, now())
    where attempt.webhook_event_id = claimed_event.id
      and attempt.outcome = 'processing'
      and attempt.attempt_number < claimed_event.processing_attempt_count;

    insert into public.stripe_webhook_attempts (
      webhook_event_id,
      attempt_number,
      claim_token,
      outcome
    ) values (
      claimed_event.id,
      claimed_event.processing_attempt_count,
      requested_claim_token,
      'processing'
    );

    return next claimed_event;
  end if;
end;
$$;

create or replace function public.complete_stripe_webhook_event(
  requested_event_id text,
  requested_claim_token uuid,
  requested_outcome text,
  requested_error_code text default null,
  requested_error_details jsonb default '{}'::jsonb,
  requested_next_attempt_at timestamptz default null,
  requested_ignored_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_event public.stripe_webhook_events%rowtype;
begin
  if requested_outcome not in ('processed', 'failed', 'ignored') then
    raise exception 'Unsupported webhook completion outcome';
  end if;

  update public.stripe_webhook_events as event
  set status = requested_outcome,
      processed_at = case
        when requested_outcome in ('processed', 'ignored') then timezone('utc'::text, now())
        else null
      end,
      next_attempt_at = case
        when requested_outcome = 'failed' then requested_next_attempt_at
        else null
      end,
      error_message = case
        when requested_outcome = 'failed' then requested_error_code
        else null
      end,
      last_error_code = case
        when requested_outcome = 'failed' then requested_error_code
        else null
      end,
      last_error_details = case
        when requested_outcome = 'failed' then coalesce(requested_error_details, '{}'::jsonb)
        else '{}'::jsonb
      end,
      ignored_reason = case
        when requested_outcome = 'ignored' then requested_ignored_reason
        else null
      end,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null
  where event.stripe_event_id = requested_event_id
    and event.status = 'processing'
    and event.claim_token = requested_claim_token
  returning event.* into completed_event;

  if not found then
    return false;
  end if;

  update public.stripe_webhook_attempts as attempt
  set outcome = requested_outcome,
      error_code = case when requested_outcome = 'failed' then requested_error_code else null end,
      error_details = case
        when requested_outcome = 'failed' then coalesce(requested_error_details, '{}'::jsonb)
        else '{}'::jsonb
      end,
      finished_at = timezone('utc'::text, now())
  where attempt.webhook_event_id = completed_event.id
    and attempt.attempt_number = completed_event.processing_attempt_count
    and attempt.claim_token = requested_claim_token
    and attempt.outcome = 'processing';

  return true;
end;
$$;

create or replace function public.request_stripe_webhook_replay(
  requested_event_id text,
  requested_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stripe_webhook_events as event
  set status = 'received',
      next_attempt_at = null,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null,
      error_message = null,
      last_error_code = null,
      last_error_details = '{}'::jsonb,
      replay_requested_at = timezone('utc'::text, now()),
      replay_requested_by = requested_by
  where event.stripe_event_id = requested_event_id
    and event.status = 'failed';

  return found;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, uuid, integer) to service_role;
revoke all on function public.complete_stripe_webhook_event(text, uuid, text, text, jsonb, timestamptz, text) from public, anon, authenticated;
grant execute on function public.complete_stripe_webhook_event(text, uuid, text, text, jsonb, timestamptz, text) to service_role;
revoke all on function public.request_stripe_webhook_replay(text, uuid) from public, anon, authenticated;
grant execute on function public.request_stripe_webhook_replay(text, uuid) to service_role;

commit;
