begin;

-- Phase 3B adds a test-only, explicitly confirmed rescue action. Both the
-- platform and account controls default to false. No token can be issued or
-- consumed for live-mode data.
create table if not exists public.cancellation_test_action_controls (
  control_key text primary key check (control_key = 'test_rescue_actions'),
  enabled boolean not null default false,
  reason text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.cancellation_test_action_controls (control_key, enabled)
values ('test_rescue_actions', false)
on conflict (control_key) do nothing;

alter table public.cancellation_rescue_settings
  add column if not exists test_rescue_actions_enabled boolean not null default false;

create table if not exists public.cancellation_rescue_tokens (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null check (livemode = false),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique,
  status text not null default 'issued' check (
    status in ('issued', 'reserved', 'consumed', 'expired', 'revoked')
  ),
  expires_at timestamptz not null,
  reservation_token uuid,
  reservation_expires_at timestamptz,
  reserved_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists cancellation_rescue_one_active_token_per_case_idx
  on public.cancellation_rescue_tokens (cancellation_case_id)
  where status in ('issued', 'reserved');
create index if not exists cancellation_rescue_token_expiry_idx
  on public.cancellation_rescue_tokens (status, expires_at);

create table if not exists public.cancellation_rescue_attempts (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null unique references public.cancellation_rescue_tokens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null check (livemode = false),
  stripe_subscription_id text not null,
  idempotency_key text not null unique,
  status text not null default 'reserved' check (
    status in ('reserved', 'stripe_accepted', 'confirmed', 'rejected', 'reconciliation_required')
  ),
  pre_cancel_at_period_end boolean,
  post_cancel_at_period_end boolean,
  stripe_request_id text,
  error_code text,
  reserved_at timestamptz not null default timezone('utc'::text, now()),
  stripe_accepted_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists cancellation_rescue_attempt_reconcile_idx
  on public.cancellation_rescue_attempts (status, created_at)
  where status in ('stripe_accepted', 'reconciliation_required');

create table if not exists public.cancellation_rescue_token_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.cancellation_rescue_tokens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'issued', 'previewed', 'reserved', 'stripe_accepted', 'confirmed',
      'rejected', 'reconciliation_required', 'expired', 'revoked'
    )
  ),
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists cancellation_rescue_token_events_token_idx
  on public.cancellation_rescue_token_events (token_id, recorded_at);

create table if not exists public.cancellation_rescue_rate_limits (
  rate_limit_key text not null check (rate_limit_key ~ '^[0-9a-f]{64}$'),
  endpoint text not null check (endpoint in ('preview', 'confirm')),
  window_started_at timestamptz not null default timezone('utc'::text, now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (rate_limit_key, endpoint)
);

alter table public.cancellation_test_action_controls enable row level security;
alter table public.cancellation_rescue_tokens enable row level security;
alter table public.cancellation_rescue_attempts enable row level security;
alter table public.cancellation_rescue_token_events enable row level security;
alter table public.cancellation_rescue_rate_limits enable row level security;

create or replace function public.consume_cancellation_test_rescue_rate_limit(
  requested_rate_limit_key text,
  requested_endpoint text,
  requested_limit integer,
  requested_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted boolean;
begin
  if requested_rate_limit_key !~ '^[0-9a-f]{64}$'
    or requested_endpoint not in ('preview', 'confirm')
    or requested_limit not between 1 and 100
    or requested_window_seconds not between 60 and 86400 then
    return false;
  end if;

  insert into public.cancellation_rescue_rate_limits as limits (
    rate_limit_key, endpoint, request_count
  ) values (
    requested_rate_limit_key, requested_endpoint, 1
  )
  on conflict (rate_limit_key, endpoint) do update set
    request_count = case
      when limits.window_started_at + make_interval(secs => requested_window_seconds)
        <= timezone('utc'::text, now()) then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at + make_interval(secs => requested_window_seconds)
        <= timezone('utc'::text, now()) then timezone('utc'::text, now())
      else limits.window_started_at
    end,
    updated_at = timezone('utc'::text, now())
  returning limits.request_count <= requested_limit into accepted;

  return coalesce(accepted, false);
end;
$$;

create or replace function public.issue_cancellation_test_rescue_token(
  requested_case_id uuid,
  requested_token_id uuid,
  requested_token_hash text,
  requested_idempotency_key text,
  requested_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_case public.cancellation_cases%rowtype;
begin
  if requested_token_hash !~ '^[0-9a-f]{64}$'
    or nullif(trim(requested_idempotency_key), '') is null
    or requested_expires_at <= timezone('utc'::text, now())
    or requested_expires_at > timezone('utc'::text, now()) + interval '1 hour' then
    raise exception 'invalid test rescue token request';
  end if;

  select cases.* into target_case
  from public.cancellation_cases cases
  where cases.id = requested_case_id
  for update;

  if target_case.id is null
    or target_case.livemode
    or target_case.status <> 'shadow'
    or not target_case.cancel_at_period_end
    or coalesce(target_case.cancel_at, target_case.current_period_end) is null
    or coalesce(target_case.cancel_at, target_case.current_period_end)
      <= timezone('utc'::text, now()) then
    raise exception 'test rescue case is not eligible';
  end if;

  if not exists (
    select 1
    from public.cancellation_rescue_settings settings
    join public.cancellation_test_action_controls controls
      on controls.control_key = 'test_rescue_actions'
    where settings.user_id = target_case.user_id
      and settings.stripe_account_id = target_case.stripe_account_id
      and not settings.livemode
      and settings.mode = 'test'
      and settings.test_rescue_actions_enabled
      and controls.enabled
      and exists (
        select 1 from public.cancellation_platform_controls platform_controls
        where platform_controls.control_key = 'shadow_processing'
          and platform_controls.enabled
      )
  ) or not exists (
    select 1 from public.stripe_connections connections
    where connections.user_id = target_case.user_id
      and connections.stripe_account_id = target_case.stripe_account_id
      and connections.livemode = false
      and connections.status = 'connected'
  ) then
    raise exception 'test rescue controls are disabled';
  end if;

  insert into public.cancellation_rescue_tokens (
    id, user_id, cancellation_case_id, stripe_account_id, livemode,
    token_hash, idempotency_key, expires_at
  ) values (
    requested_token_id, target_case.user_id, target_case.id,
    target_case.stripe_account_id, false, requested_token_hash,
    requested_idempotency_key, requested_expires_at
  );

  insert into public.cancellation_rescue_token_events (
    token_id, user_id, cancellation_case_id, event_type, evidence
  ) values (
    requested_token_id, target_case.user_id, target_case.id, 'issued',
    jsonb_build_object('expires_at', requested_expires_at)
  );

  return requested_token_id;
end;
$$;

create or replace function public.preview_cancellation_test_rescue_token(
  requested_token_hash text
)
returns table (
  token_id uuid,
  cancellation_case_id uuid,
  scheduled_end_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_token public.cancellation_rescue_tokens%rowtype;
  target_case public.cancellation_cases%rowtype;
begin
  select tokens.* into target_token
  from public.cancellation_rescue_tokens tokens
  where tokens.token_hash = requested_token_hash
  for update;

  if target_token.id is null then
    return;
  end if;

  if target_token.status = 'issued'
    and target_token.expires_at <= timezone('utc'::text, now()) then
    update public.cancellation_rescue_tokens tokens
    set status = 'expired', updated_at = timezone('utc'::text, now())
    where tokens.id = target_token.id;
    insert into public.cancellation_rescue_token_events (
      token_id, user_id, cancellation_case_id, event_type
    ) values (
      target_token.id, target_token.user_id, target_token.cancellation_case_id, 'expired'
    );
    return;
  end if;

  select cases.* into target_case
  from public.cancellation_cases cases
  where cases.id = target_token.cancellation_case_id;

  if target_token.status <> 'issued'
    or target_token.livemode
    or target_case.id is null
    or target_case.user_id <> target_token.user_id
    or target_case.stripe_account_id <> target_token.stripe_account_id
    or target_case.livemode
    or target_case.status <> 'shadow'
    or not target_case.cancel_at_period_end
    or coalesce(target_case.cancel_at, target_case.current_period_end) is null
    or coalesce(target_case.cancel_at, target_case.current_period_end)
      <= timezone('utc'::text, now())
    or not exists (
      select 1
      from public.cancellation_rescue_settings settings
      join public.cancellation_test_action_controls controls
        on controls.control_key = 'test_rescue_actions'
      where settings.user_id = target_token.user_id
        and settings.stripe_account_id = target_token.stripe_account_id
        and not settings.livemode
        and settings.mode = 'test'
        and settings.test_rescue_actions_enabled
        and controls.enabled
        and exists (
          select 1 from public.cancellation_platform_controls platform_controls
          where platform_controls.control_key = 'shadow_processing'
            and platform_controls.enabled
        )
    )
    or not exists (
      select 1 from public.stripe_connections connections
      where connections.user_id = target_token.user_id
        and connections.stripe_account_id = target_token.stripe_account_id
        and connections.livemode = false
        and connections.status = 'connected'
    ) then
    return;
  end if;

  insert into public.cancellation_rescue_token_events (
    token_id, user_id, cancellation_case_id, event_type
  ) values (
    target_token.id, target_token.user_id, target_token.cancellation_case_id, 'previewed'
  );

  return query select
    target_token.id,
    target_case.id,
    coalesce(target_case.cancel_at, target_case.current_period_end),
    target_token.expires_at;
end;
$$;

create or replace function public.reserve_cancellation_test_rescue_token(
  requested_token_hash text,
  requested_reservation_token uuid,
  requested_lease_seconds integer default 120
)
returns table (
  token_id uuid,
  cancellation_case_id uuid,
  user_id uuid,
  stripe_account_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  idempotency_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_token public.cancellation_rescue_tokens%rowtype;
  target_case public.cancellation_cases%rowtype;
begin
  if requested_reservation_token is null
    or requested_token_hash !~ '^[0-9a-f]{64}$'
    or requested_lease_seconds not between 30 and 300 then
    return;
  end if;

  select tokens.* into target_token
  from public.cancellation_rescue_tokens tokens
  where tokens.token_hash = requested_token_hash
  for update;

  if target_token.id is null
    or target_token.status <> 'issued'
    or target_token.livemode
    or target_token.expires_at <= timezone('utc'::text, now()) then
    return;
  end if;

  select cases.* into target_case
  from public.cancellation_cases cases
  where cases.id = target_token.cancellation_case_id
  for update;

  if target_case.id is null
    or target_case.user_id <> target_token.user_id
    or target_case.stripe_account_id <> target_token.stripe_account_id
    or target_case.status <> 'shadow'
    or target_case.livemode
    or not target_case.cancel_at_period_end
    or coalesce(target_case.cancel_at, target_case.current_period_end) is null
    or coalesce(target_case.cancel_at, target_case.current_period_end)
      <= timezone('utc'::text, now())
    or not exists (
      select 1
      from public.cancellation_rescue_settings settings
      join public.cancellation_test_action_controls controls
        on controls.control_key = 'test_rescue_actions'
      where settings.user_id = target_token.user_id
        and settings.stripe_account_id = target_token.stripe_account_id
        and not settings.livemode
        and settings.mode = 'test'
        and settings.test_rescue_actions_enabled
        and controls.enabled
        and exists (
          select 1 from public.cancellation_platform_controls platform_controls
          where platform_controls.control_key = 'shadow_processing'
            and platform_controls.enabled
        )
    )
    or not exists (
      select 1 from public.stripe_connections connections
      where connections.user_id = target_token.user_id
        and connections.stripe_account_id = target_token.stripe_account_id
        and connections.livemode = false
        and connections.status = 'connected'
    ) then
    return;
  end if;

  update public.cancellation_rescue_tokens tokens
  set status = 'reserved',
      reservation_token = requested_reservation_token,
      reservation_expires_at = timezone('utc'::text, now()) +
        make_interval(secs => requested_lease_seconds),
      reserved_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where tokens.id = target_token.id;

  insert into public.cancellation_rescue_attempts (
    token_id, user_id, cancellation_case_id, stripe_account_id, livemode,
    stripe_subscription_id, idempotency_key
  ) values (
    target_token.id, target_token.user_id, target_case.id,
    target_token.stripe_account_id, false, target_case.stripe_subscription_id,
    target_token.idempotency_key
  );

  insert into public.cancellation_rescue_token_events (
    token_id, user_id, cancellation_case_id, event_type
  ) values (
    target_token.id, target_token.user_id, target_case.id, 'reserved'
  );

  return query select
    target_token.id,
    target_case.id,
    target_token.user_id,
    target_token.stripe_account_id,
    target_case.stripe_customer_id,
    target_case.stripe_subscription_id,
    target_token.idempotency_key;
end;
$$;

create or replace function public.complete_cancellation_test_rescue_attempt(
  requested_token_id uuid,
  requested_reservation_token uuid,
  requested_outcome text,
  requested_pre_cancel_at_period_end boolean default null,
  requested_post_cancel_at_period_end boolean default null,
  requested_stripe_request_id text default null,
  requested_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_token public.cancellation_rescue_tokens%rowtype;
begin
  if requested_outcome not in ('stripe_accepted', 'rejected', 'reconciliation_required') then
    return false;
  end if;

  select tokens.* into target_token
  from public.cancellation_rescue_tokens tokens
  where tokens.id = requested_token_id
    and tokens.status = 'reserved'
    and tokens.reservation_token = requested_reservation_token
  for update;

  if target_token.id is null then
    return false;
  end if;

  update public.cancellation_rescue_tokens tokens
  set status = 'consumed',
      consumed_at = timezone('utc'::text, now()),
      reservation_token = null,
      reservation_expires_at = null,
      updated_at = timezone('utc'::text, now())
  where tokens.id = target_token.id;

  update public.cancellation_rescue_attempts attempts
  set status = requested_outcome,
      pre_cancel_at_period_end = requested_pre_cancel_at_period_end,
      post_cancel_at_period_end = requested_post_cancel_at_period_end,
      stripe_request_id = requested_stripe_request_id,
      error_code = requested_error_code,
      stripe_accepted_at = case when requested_outcome = 'stripe_accepted'
        then timezone('utc'::text, now()) else null end,
      completed_at = case when requested_outcome = 'rejected'
        then timezone('utc'::text, now()) else null end,
      updated_at = timezone('utc'::text, now())
  where attempts.token_id = target_token.id and attempts.status = 'reserved';

  insert into public.cancellation_rescue_token_events (
    token_id, user_id, cancellation_case_id, event_type, evidence
  ) values (
    target_token.id, target_token.user_id, target_token.cancellation_case_id,
    requested_outcome,
    jsonb_strip_nulls(jsonb_build_object(
      'error_code', requested_error_code,
      'stripe_request_id', requested_stripe_request_id
    ))
  );

  return true;
end;
$$;

create or replace function public.reconcile_stale_cancellation_test_rescue_reservations(
  requested_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  with candidates as (
    select tokens.id
    from public.cancellation_rescue_tokens tokens
    join public.cancellation_rescue_attempts attempts on attempts.token_id = tokens.id
    where tokens.status = 'reserved'
      and tokens.reservation_expires_at <= timezone('utc'::text, now())
      and attempts.status = 'reserved'
    order by tokens.reservation_expires_at
    for update of tokens, attempts skip locked
    limit least(greatest(requested_limit, 1), 500)
  ), consumed as (
    update public.cancellation_rescue_tokens tokens
    set status = 'consumed',
        consumed_at = timezone('utc'::text, now()),
        reservation_token = null,
        reservation_expires_at = null,
        updated_at = timezone('utc'::text, now())
    from candidates
    where tokens.id = candidates.id
    returning tokens.id, tokens.user_id, tokens.cancellation_case_id
  ), uncertain as (
    update public.cancellation_rescue_attempts attempts
    set status = 'reconciliation_required',
        error_code = 'reservation_outcome_unknown',
        updated_at = timezone('utc'::text, now())
    from consumed
    where attempts.token_id = consumed.id
      and attempts.status = 'reserved'
    returning attempts.token_id, attempts.user_id, attempts.cancellation_case_id
  ), evidence as (
    insert into public.cancellation_rescue_token_events (
      token_id, user_id, cancellation_case_id, event_type, evidence
    )
    select
      token_id,
      user_id,
      cancellation_case_id,
      'reconciliation_required',
      jsonb_build_object('error_code', 'reservation_outcome_unknown')
    from uncertain
    returning id
  )
  select count(*) into changed_count from evidence;

  return changed_count;
end;
$$;

create or replace function public.finalize_confirmed_cancellation_test_rescues(
  requested_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  with candidates as (
    select attempts.id
    from public.cancellation_rescue_attempts attempts
    join public.cancellation_cases cases on cases.id = attempts.cancellation_case_id
    where attempts.status in ('stripe_accepted', 'reconciliation_required')
      and cases.status = 'reversed'
      and not cases.livemode
    order by attempts.created_at
    for update of attempts skip locked
    limit least(greatest(requested_limit, 1), 500)
  ), confirmed as (
    update public.cancellation_rescue_attempts attempts
    set status = 'confirmed',
        confirmed_at = timezone('utc'::text, now()),
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    from candidates
    where attempts.id = candidates.id
    returning attempts.token_id, attempts.user_id, attempts.cancellation_case_id
  ), evidence as (
    insert into public.cancellation_rescue_token_events (
      token_id, user_id, cancellation_case_id, event_type
    )
    select token_id, user_id, cancellation_case_id, 'confirmed'
    from confirmed
    returning id
  )
  select count(*) into changed_count from evidence;

  return changed_count;
end;
$$;

create or replace function public.expire_cancellation_test_rescue_tokens(
  requested_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  with candidates as (
    select tokens.id
    from public.cancellation_rescue_tokens tokens
    where tokens.status = 'issued'
      and tokens.expires_at <= timezone('utc'::text, now())
    order by tokens.expires_at
    for update of tokens skip locked
    limit least(greatest(requested_limit, 1), 500)
  ), expired as (
    update public.cancellation_rescue_tokens tokens
    set status = 'expired', updated_at = timezone('utc'::text, now())
    from candidates
    where tokens.id = candidates.id
    returning tokens.id, tokens.user_id, tokens.cancellation_case_id
  ), evidence as (
    insert into public.cancellation_rescue_token_events (
      token_id, user_id, cancellation_case_id, event_type
    )
    select id, user_id, cancellation_case_id, 'expired'
    from expired
    returning id
  )
  select count(*) into changed_count from evidence;

  return changed_count;
end;
$$;

revoke all on table public.cancellation_test_action_controls from public, anon, authenticated;
revoke all on table public.cancellation_rescue_tokens from public, anon, authenticated;
revoke all on table public.cancellation_rescue_attempts from public, anon, authenticated;
revoke all on table public.cancellation_rescue_token_events from public, anon, authenticated;
revoke all on table public.cancellation_rescue_rate_limits from public, anon, authenticated;

grant select, insert, update on public.cancellation_test_action_controls to service_role;
grant select, insert, update on public.cancellation_rescue_tokens to service_role;
grant select, insert, update on public.cancellation_rescue_attempts to service_role;
grant select, insert on public.cancellation_rescue_token_events to service_role;
grant select, insert, update on public.cancellation_rescue_rate_limits to service_role;

revoke all on function public.consume_cancellation_test_rescue_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.issue_cancellation_test_rescue_token(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.preview_cancellation_test_rescue_token(text) from public, anon, authenticated;
revoke all on function public.reserve_cancellation_test_rescue_token(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_cancellation_test_rescue_attempt(uuid, uuid, text, boolean, boolean, text, text) from public, anon, authenticated;
revoke all on function public.reconcile_stale_cancellation_test_rescue_reservations(integer) from public, anon, authenticated;
revoke all on function public.finalize_confirmed_cancellation_test_rescues(integer) from public, anon, authenticated;
revoke all on function public.expire_cancellation_test_rescue_tokens(integer) from public, anon, authenticated;

grant execute on function public.consume_cancellation_test_rescue_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.issue_cancellation_test_rescue_token(uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.preview_cancellation_test_rescue_token(text) to service_role;
grant execute on function public.reserve_cancellation_test_rescue_token(text, uuid, integer) to service_role;
grant execute on function public.complete_cancellation_test_rescue_attempt(uuid, uuid, text, boolean, boolean, text, text) to service_role;
grant execute on function public.reconcile_stale_cancellation_test_rescue_reservations(integer) to service_role;
grant execute on function public.finalize_confirmed_cancellation_test_rescues(integer) to service_role;
grant execute on function public.expire_cancellation_test_rescue_tokens(integer) to service_role;

commit;
