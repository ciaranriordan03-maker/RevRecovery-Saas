begin;

-- Phase 3A remains shadow-only. These controls stop observation/projection work;
-- they do not enable delivery, customer links, or Stripe mutation.
create table if not exists public.cancellation_platform_controls (
  control_key text primary key check (control_key = 'shadow_processing'),
  enabled boolean not null default false,
  reason text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.cancellation_platform_controls (control_key, enabled)
values ('shadow_processing', false)
on conflict (control_key) do nothing;

alter table public.cancellation_rescue_settings
  add column if not exists shadow_processing_enabled boolean not null default true,
  add column if not exists last_reconciled_at timestamptz;

create table if not exists public.cancellation_event_order (
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  stripe_subscription_id text not null,
  event_created_at timestamptz not null,
  source_event_id text not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, stripe_account_id, livemode, stripe_subscription_id)
);
alter table public.cancellation_event_order enable row level security;

create or replace function public.claim_cancellation_event_order(
  requested_user_id uuid,
  requested_stripe_account_id text,
  requested_livemode boolean,
  requested_stripe_subscription_id text,
  requested_event_created_at timestamptz,
  requested_source_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare accepted boolean;
begin
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      requested_user_id::text || ':' || requested_stripe_account_id || ':' ||
      requested_livemode::text || ':' || requested_stripe_subscription_id,
      0
    )
  );

  if exists (
    select 1 from public.cancellation_event_order ordering
    where ordering.user_id = requested_user_id
      and ordering.stripe_account_id = requested_stripe_account_id
      and ordering.livemode = requested_livemode
      and ordering.stripe_subscription_id = requested_stripe_subscription_id
      and ordering.event_created_at = requested_event_created_at
      and ordering.source_event_id = requested_source_event_id
  ) then
    return true;
  end if;

  insert into public.cancellation_event_order as ordering (
    user_id, stripe_account_id, livemode, stripe_subscription_id,
    event_created_at, source_event_id
  ) values (
    requested_user_id, requested_stripe_account_id, requested_livemode,
    requested_stripe_subscription_id, requested_event_created_at,
    requested_source_event_id
  )
  on conflict (user_id, stripe_account_id, livemode, stripe_subscription_id)
  do update set
    event_created_at = excluded.event_created_at,
    source_event_id = excluded.source_event_id,
    updated_at = timezone('utc'::text, now())
  where (excluded.event_created_at, excluded.source_event_id) >
        (ordering.event_created_at, ordering.source_event_id)
  returning true into accepted;
  return coalesce(accepted, false);
end;
$$;

create table if not exists public.cancellation_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')
  ),
  cursor text,
  pages_processed integer not null default 0 check (pages_processed >= 0),
  subscriptions_observed integer not null default 0 check (subscriptions_observed >= 0),
  processing_attempt_count integer not null default 0 check (processing_attempt_count >= 0),
  claim_token uuid,
  claim_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists cancellation_reconciliation_one_open_run_idx
  on public.cancellation_reconciliation_runs (user_id, stripe_account_id, livemode)
  where status in ('pending', 'processing', 'failed');
create index if not exists cancellation_reconciliation_claim_idx
  on public.cancellation_reconciliation_runs (status, next_attempt_at, claim_expires_at, created_at);

create table if not exists public.cancellation_projection_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  source_case_event_id uuid not null references public.cancellation_case_events(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')
  ),
  processing_attempt_count integer not null default 0 check (processing_attempt_count >= 0),
  claim_token uuid,
  claim_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (source_case_event_id)
);

create index if not exists cancellation_projection_outbox_claim_idx
  on public.cancellation_projection_outbox (status, next_attempt_at, claim_expires_at, created_at);

alter table public.cancellation_reconciliation_runs enable row level security;
alter table public.cancellation_projection_outbox enable row level security;
alter table public.cancellation_platform_controls enable row level security;

create policy "Users can view their cancellation reconciliation runs"
on public.cancellation_reconciliation_runs for select to authenticated
using (auth.uid() = user_id);

create policy "Users can view their cancellation projection jobs"
on public.cancellation_projection_outbox for select to authenticated
using (auth.uid() = user_id);

-- Every material case transition durably schedules projection in the same DB
-- transaction as its evidence row.
create or replace function public.enqueue_cancellation_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cancellation_projection_outbox (
    user_id, cancellation_case_id, source_case_event_id
  ) values (
    new.user_id, new.cancellation_case_id, new.id
  ) on conflict (source_case_event_id) do nothing;
  return new;
end;
$$;

drop trigger if exists cancellation_case_events_enqueue_projection
  on public.cancellation_case_events;
create trigger cancellation_case_events_enqueue_projection
after insert on public.cancellation_case_events
for each row execute function public.enqueue_cancellation_projection();

create or replace function public.claim_cancellation_projection_jobs(
  requested_limit integer,
  requested_claim_token uuid,
  requested_lease_seconds integer default 120,
  requested_max_attempts integer default 8
)
returns setof public.cancellation_projection_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select job.id
    from public.cancellation_projection_outbox job
    join public.cancellation_cases cases on cases.id = job.cancellation_case_id
    join public.cancellation_rescue_settings settings
      on settings.user_id = cases.user_id
     and settings.stripe_account_id = cases.stripe_account_id
     and settings.livemode = cases.livemode
    where settings.shadow_processing_enabled
      and exists (
        select 1 from public.cancellation_platform_controls controls
        where controls.control_key = 'shadow_processing' and controls.enabled
      )
      and (
        (job.status in ('pending', 'failed') and
          (job.next_attempt_at is null or job.next_attempt_at <= timezone('utc'::text, now())))
        or (job.status = 'processing' and job.claim_expires_at < timezone('utc'::text, now()))
      )
      and job.processing_attempt_count < requested_max_attempts
    order by job.created_at
    for update of job skip locked
    limit least(greatest(requested_limit, 1), 100)
  )
  update public.cancellation_projection_outbox job
  set status = 'processing',
      processing_attempt_count = job.processing_attempt_count + 1,
      claim_token = requested_claim_token,
      claim_expires_at = timezone('utc'::text, now()) +
        make_interval(secs => greatest(requested_lease_seconds, 1)),
      last_error_code = null,
      updated_at = timezone('utc'::text, now())
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

create or replace function public.complete_cancellation_projection_job(
  requested_job_id uuid,
  requested_claim_token uuid,
  requested_outcome text,
  requested_error_code text default null,
  requested_next_attempt_at timestamptz default null,
  requested_max_attempts integer default 8
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_outcome not in ('completed', 'failed') then
    raise exception 'unsupported projection outcome';
  end if;

  update public.cancellation_projection_outbox job
  set status = case
        when requested_outcome = 'failed' and job.processing_attempt_count >= requested_max_attempts
          then 'dead_letter'
        else requested_outcome
      end,
      completed_at = case when requested_outcome = 'completed'
        then timezone('utc'::text, now()) else null end,
      next_attempt_at = case when requested_outcome = 'failed'
        then requested_next_attempt_at else null end,
      last_error_code = case when requested_outcome = 'failed'
        then requested_error_code else null end,
      claim_token = null,
      claim_expires_at = null,
      updated_at = timezone('utc'::text, now())
  where job.id = requested_job_id
    and job.status = 'processing'
    and job.claim_token = requested_claim_token;
  return found;
end;
$$;

create or replace function public.expire_due_cancellation_cases(requested_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  with due as (
    select cases.id
    from public.cancellation_cases cases
    join public.cancellation_rescue_settings settings
      on settings.user_id = cases.user_id
     and settings.stripe_account_id = cases.stripe_account_id
     and settings.livemode = cases.livemode
    where cases.status = 'shadow'
      and settings.shadow_processing_enabled
      and coalesce(cases.cancel_at, cases.current_period_end) <= timezone('utc'::text, now())
      and exists (
        select 1 from public.cancellation_platform_controls controls
        where controls.control_key = 'shadow_processing' and controls.enabled
      )
    order by coalesce(cases.cancel_at, cases.current_period_end)
    for update of cases skip locked
    limit least(greatest(requested_limit, 1), 500)
  ), expired as (
    update public.cancellation_cases cases
    set status = 'expired', expired_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    from due where cases.id = due.id
    returning cases.*
  ), evidence as (
    insert into public.cancellation_case_events (
      user_id, cancellation_case_id, stripe_account_id, livemode,
      stripe_subscription_id, source, source_event_id, event_type,
      transition, previous_status, next_status, occurred_at, evidence
    )
    select expired.user_id, expired.id, expired.stripe_account_id,
      expired.livemode, expired.stripe_subscription_id, 'reconciliation',
      'expiration:' || expired.id::text || ':' ||
        extract(epoch from coalesce(expired.cancel_at, expired.current_period_end))::bigint::text,
      'customer.subscription.updated', 'cancellation_expired', 'shadow',
      'expired', timezone('utc'::text, now()),
      jsonb_build_object('reason', 'scheduled_end_elapsed')
    from expired
    on conflict (user_id, stripe_account_id, livemode, source, source_event_id)
      do nothing
    returning id
  )
  select count(*) into changed_count from evidence;
  return changed_count;
end;
$$;

alter table public.stripe_webhook_events
  add column if not exists dead_lettered_at timestamptz;

create or replace function public.dead_letter_exhausted_stripe_webhooks(
  requested_max_attempts integer default 8
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare changed_count integer;
begin
  update public.stripe_webhook_events event
  set status = 'failed',
      next_attempt_at = null,
      dead_lettered_at = timezone('utc'::text, now()),
      last_error_code = coalesce(event.last_error_code, 'WEBHOOK_RETRY_EXHAUSTED')
  where event.status in ('received', 'failed', 'processing')
    and event.processing_attempt_count >= requested_max_attempts
    and (event.status <> 'processing' or event.claim_expires_at < timezone('utc'::text, now()))
    and event.dead_lettered_at is null;
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on table public.cancellation_platform_controls from public, anon, authenticated;
revoke all on table public.cancellation_event_order from public, anon, authenticated;
revoke insert, update, delete on public.cancellation_reconciliation_runs from public, anon, authenticated;
revoke insert, update, delete on public.cancellation_projection_outbox from public, anon, authenticated;
grant select on public.cancellation_reconciliation_runs to authenticated;
grant select on public.cancellation_projection_outbox to authenticated;
grant select, insert, update on public.cancellation_reconciliation_runs to service_role;
grant select, insert, update on public.cancellation_projection_outbox to service_role;
grant select on public.cancellation_platform_controls to service_role;
grant select, insert, update on public.cancellation_event_order to service_role;

revoke all on function public.enqueue_cancellation_projection() from public, anon, authenticated;
revoke all on function public.claim_cancellation_event_order(uuid, text, boolean, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.claim_cancellation_projection_jobs(integer, uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.complete_cancellation_projection_job(uuid, uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.expire_due_cancellation_cases(integer) from public, anon, authenticated;
revoke all on function public.dead_letter_exhausted_stripe_webhooks(integer) from public, anon, authenticated;
grant execute on function public.enqueue_cancellation_projection() to service_role;
grant execute on function public.claim_cancellation_event_order(uuid, text, boolean, text, timestamptz, text) to service_role;
grant execute on function public.claim_cancellation_projection_jobs(integer, uuid, integer, integer) to service_role;
grant execute on function public.complete_cancellation_projection_job(uuid, uuid, text, text, timestamptz, integer) to service_role;
grant execute on function public.expire_due_cancellation_cases(integer) to service_role;
grant execute on function public.dead_letter_exhausted_stripe_webhooks(integer) to service_role;

commit;
