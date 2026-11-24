-- Phase 1 cancellation rescue: isolated shadow-mode evidence foundation.
-- This migration creates no message, delivery, token, customer route, or Stripe mutation path.

create table if not exists public.cancellation_rescue_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  mode text not null default 'shadow' check (
    mode in ('disabled', 'shadow', 'test', 'approval_required', 'live')
  ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, stripe_account_id, livemode)
);

create table if not exists public.cancellation_subscription_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  cancel_at_period_end boolean not null default false,
  episode_counter integer not null default 0 check (episode_counter >= 0),
  current_case_id uuid,
  latest_event_created_at timestamptz not null,
  latest_source_event_id text not null,
  latest_event_type text not null,
  latest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, stripe_account_id, livemode, stripe_subscription_id)
);

create table if not exists public.cancellation_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  episode_number integer not null check (episode_number > 0),
  episode_key text not null,
  status text not null check (
    status in ('shadow', 'reversed', 'terminated', 'expired', 'ineligible', 'failed_operationally')
  ),
  detected_source text not null check (detected_source in ('stripe_webhook', 'initial_sync', 'reconciliation')),
  first_stripe_event_id text,
  latest_stripe_event_id text,
  event_created_at timestamptz not null,
  previous_cancel_at_period_end boolean,
  cancel_at_period_end boolean not null,
  cancel_at timestamptz,
  canceled_at timestamptz,
  current_period_end timestamptz,
  subscription_status text,
  currency text check (currency is null or currency ~ '^[a-z]{3}$'),
  recurring_value_cents bigint check (recurring_value_cents is null or recurring_value_cents >= 0),
  recurring_interval text,
  recurring_interval_count integer check (
    recurring_interval_count is null or recurring_interval_count > 0
  ),
  recurring_value_source text check (
    recurring_value_source is null or recurring_value_source = 'subscription_items_list_price'
  ),
  cancellation_reason text,
  cancellation_feedback text,
  cancellation_comment text,
  configuration_snapshot jsonb not null default '{}'::jsonb,
  latest_payload jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null,
  reversed_at timestamptz,
  terminated_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, stripe_account_id, livemode, stripe_subscription_id, episode_number),
  unique (episode_key)
);

alter table public.cancellation_subscription_states
  drop constraint if exists cancellation_subscription_states_current_case_id_fkey;
alter table public.cancellation_subscription_states
  add constraint cancellation_subscription_states_current_case_id_fkey
  foreign key (current_case_id) references public.cancellation_cases(id) on delete set null;

create table if not exists public.cancellation_case_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  stripe_subscription_id text not null,
  source text not null check (source in ('stripe_webhook', 'initial_sync', 'reconciliation')),
  source_event_id text not null,
  event_type text not null,
  transition text not null,
  previous_status text,
  next_status text not null,
  occurred_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, stripe_account_id, livemode, source, source_event_id)
);

create index if not exists cancellation_cases_user_status_idx
  on public.cancellation_cases (user_id, status, detected_at desc);
create index if not exists cancellation_cases_subscription_idx
  on public.cancellation_cases (stripe_account_id, livemode, stripe_subscription_id);
create index if not exists cancellation_case_events_case_idx
  on public.cancellation_case_events (cancellation_case_id, occurred_at, recorded_at);

alter table public.cancellation_rescue_settings enable row level security;
alter table public.cancellation_subscription_states enable row level security;
alter table public.cancellation_cases enable row level security;
alter table public.cancellation_case_events enable row level security;

drop policy if exists "Users can view their cancellation rescue settings" on public.cancellation_rescue_settings;
create policy "Users can view their cancellation rescue settings"
on public.cancellation_rescue_settings for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their cancellation subscription states" on public.cancellation_subscription_states;
create policy "Users can view their cancellation subscription states"
on public.cancellation_subscription_states for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their cancellation cases" on public.cancellation_cases;
create policy "Users can view their cancellation cases"
on public.cancellation_cases for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their cancellation case events" on public.cancellation_case_events;
create policy "Users can view their cancellation case events"
on public.cancellation_case_events for select to authenticated
using (auth.uid() = user_id);

create or replace function public.record_cancellation_subscription_event(
  requested_user_id uuid,
  requested_stripe_account_id text,
  requested_livemode boolean,
  requested_stripe_customer_id text,
  requested_stripe_subscription_id text,
  requested_source text,
  requested_source_event_id text,
  requested_event_type text,
  requested_event_created_at timestamptz,
  requested_cancel_at_period_end boolean,
  requested_cancel_at timestamptz,
  requested_canceled_at timestamptz,
  requested_current_period_end timestamptz,
  requested_subscription_status text,
  requested_currency text,
  requested_recurring_value_cents bigint,
  requested_recurring_interval text,
  requested_recurring_interval_count integer,
  requested_recurring_value_source text,
  requested_cancellation_reason text,
  requested_cancellation_feedback text,
  requested_cancellation_comment text,
  requested_latest_payload jsonb
)
returns table (
  outcome text,
  cancellation_case_id uuid,
  episode_number integer,
  case_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_state public.cancellation_subscription_states%rowtype;
  current_case public.cancellation_cases%rowtype;
  requested_mode text;
  next_case_id uuid;
  next_episode integer;
  next_status text;
  transition_name text;
  previous_status text;
  episode_identifier text;
begin
  if requested_source not in ('stripe_webhook', 'initial_sync', 'reconciliation') then
    raise exception 'unsupported cancellation event source';
  end if;

  if requested_event_type not in ('customer.subscription.updated', 'customer.subscription.deleted') then
    raise exception 'unsupported cancellation event type';
  end if;

  if nullif(trim(requested_stripe_account_id), '') is null
    or nullif(trim(requested_stripe_customer_id), '') is null
    or nullif(trim(requested_stripe_subscription_id), '') is null
    or nullif(trim(requested_source_event_id), '') is null then
    raise exception 'cancellation event identifiers are required';
  end if;

  insert into public.cancellation_rescue_settings (
    user_id, stripe_account_id, livemode, mode
  ) values (
    requested_user_id, requested_stripe_account_id, requested_livemode, 'shadow'
  ) on conflict (user_id, stripe_account_id, livemode) do nothing;

  select settings.mode into requested_mode
  from public.cancellation_rescue_settings as settings
  where settings.user_id = requested_user_id
    and settings.stripe_account_id = requested_stripe_account_id
    and settings.livemode = requested_livemode;

  -- Serialize even the first event for a subscription, before a state row exists.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      requested_user_id::text || ':' || requested_stripe_account_id || ':' ||
      requested_livemode::text || ':' || requested_stripe_subscription_id,
      0
    )
  );

  select state.* into current_state
  from public.cancellation_subscription_states as state
  where state.user_id = requested_user_id
    and state.stripe_account_id = requested_stripe_account_id
    and state.livemode = requested_livemode
    and state.stripe_subscription_id = requested_stripe_subscription_id
  for update;

  if current_state.id is not null
    and current_state.latest_source_event_id = requested_source_event_id then
    return query select 'duplicate'::text, current_state.current_case_id,
      current_state.episode_counter, null::text;
    return;
  end if;

  if current_state.id is not null
    and requested_event_created_at < current_state.latest_event_created_at then
    return query select 'ignored_stale'::text, current_state.current_case_id,
      current_state.episode_counter, null::text;
    return;
  end if;

  next_episode := coalesce(current_state.episode_counter, 0);
  next_case_id := current_state.current_case_id;

  if next_case_id is not null then
    select cases.* into current_case
    from public.cancellation_cases as cases
    where cases.id = next_case_id
    for update;
  end if;

  if requested_mode = 'disabled'
    and requested_event_type <> 'customer.subscription.deleted'
    and not (
      not requested_cancel_at_period_end
      and current_state.cancel_at_period_end = true
      and current_case.id is not null
      and current_case.status = 'shadow'
    ) then
    transition_name := 'disabled_observation';
  elsif requested_event_type = 'customer.subscription.deleted' then
    if current_case.id is not null and current_case.status = 'shadow' then
      previous_status := current_case.status;
      next_status := 'terminated';
      update public.cancellation_cases
      set status = next_status,
          latest_stripe_event_id = case when requested_source = 'stripe_webhook' then requested_source_event_id else latest_stripe_event_id end,
          event_created_at = requested_event_created_at,
          cancel_at_period_end = false,
          subscription_status = requested_subscription_status,
          latest_payload = coalesce(requested_latest_payload, '{}'::jsonb),
          terminated_at = requested_event_created_at,
          updated_at = timezone('utc'::text, now())
      where id = current_case.id;
      transition_name := 'subscription_terminated';
      next_case_id := current_case.id;
    else
      transition_name := 'terminal_without_open_episode';
      next_case_id := null;
    end if;
  elsif requested_cancel_at_period_end
    and (
      coalesce(current_state.cancel_at_period_end, false) = false
      or current_case.id is null
    ) then
    next_episode := next_episode + 1;
    next_status := 'shadow';
    episode_identifier := encode(
      extensions.digest(
        requested_user_id::text || ':' || requested_stripe_account_id || ':' ||
        requested_livemode::text || ':' || requested_stripe_subscription_id || ':' ||
        next_episode::text,
        'sha256'
      ),
      'hex'
    );

    insert into public.cancellation_cases (
      user_id, stripe_account_id, livemode, stripe_customer_id,
      stripe_subscription_id, episode_number, episode_key, status,
      detected_source, first_stripe_event_id, latest_stripe_event_id,
      event_created_at, previous_cancel_at_period_end, cancel_at_period_end,
      cancel_at, canceled_at, current_period_end, subscription_status,
      currency, recurring_value_cents, recurring_interval,
      recurring_interval_count, recurring_value_source, cancellation_reason,
      cancellation_feedback, cancellation_comment, configuration_snapshot,
      latest_payload, detected_at
    ) values (
      requested_user_id, requested_stripe_account_id, requested_livemode,
      requested_stripe_customer_id, requested_stripe_subscription_id,
      next_episode, episode_identifier, next_status, requested_source,
      case when requested_source = 'stripe_webhook' then requested_source_event_id else null end,
      case when requested_source = 'stripe_webhook' then requested_source_event_id else null end,
      requested_event_created_at,
      case when current_state.id is null then null else current_state.cancel_at_period_end end,
      true, requested_cancel_at, requested_canceled_at,
      requested_current_period_end, requested_subscription_status,
      requested_currency, requested_recurring_value_cents,
      requested_recurring_interval, requested_recurring_interval_count,
      requested_recurring_value_source, requested_cancellation_reason,
      requested_cancellation_feedback, requested_cancellation_comment,
      jsonb_build_object('mode', requested_mode, 'phase', 'shadow_v1'),
      coalesce(requested_latest_payload, '{}'::jsonb), requested_event_created_at
    ) returning id into next_case_id;
    transition_name := 'cancellation_scheduled';
  elsif requested_cancel_at_period_end
    and current_state.cancel_at_period_end = true
    and current_case.id is not null
    and current_case.status = 'shadow' then
    previous_status := current_case.status;
    next_status := current_case.status;
    update public.cancellation_cases
    set latest_stripe_event_id = case when requested_source = 'stripe_webhook' then requested_source_event_id else latest_stripe_event_id end,
        event_created_at = requested_event_created_at,
        cancel_at = requested_cancel_at,
        canceled_at = requested_canceled_at,
        current_period_end = requested_current_period_end,
        subscription_status = requested_subscription_status,
        currency = requested_currency,
        recurring_value_cents = requested_recurring_value_cents,
        recurring_interval = requested_recurring_interval,
        recurring_interval_count = requested_recurring_interval_count,
        recurring_value_source = requested_recurring_value_source,
        cancellation_reason = requested_cancellation_reason,
        cancellation_feedback = requested_cancellation_feedback,
        cancellation_comment = requested_cancellation_comment,
        latest_payload = coalesce(requested_latest_payload, '{}'::jsonb),
        updated_at = timezone('utc'::text, now())
    where id = current_case.id;
    transition_name := 'cancellation_updated';
    next_case_id := current_case.id;
  elsif not requested_cancel_at_period_end
    and current_state.cancel_at_period_end = true
    and current_case.id is not null
    and current_case.status = 'shadow' then
    previous_status := current_case.status;
    next_status := 'reversed';
    update public.cancellation_cases
    set status = next_status,
        latest_stripe_event_id = case when requested_source = 'stripe_webhook' then requested_source_event_id else latest_stripe_event_id end,
        event_created_at = requested_event_created_at,
        cancel_at_period_end = false,
        cancel_at = requested_cancel_at,
        canceled_at = requested_canceled_at,
        current_period_end = requested_current_period_end,
        subscription_status = requested_subscription_status,
        latest_payload = coalesce(requested_latest_payload, '{}'::jsonb),
        reversed_at = requested_event_created_at,
        updated_at = timezone('utc'::text, now())
    where id = current_case.id;
    transition_name := 'cancellation_reversed';
    next_case_id := current_case.id;
  else
    transition_name := 'state_observed';
  end if;

  insert into public.cancellation_subscription_states (
    user_id, stripe_account_id, livemode, stripe_customer_id,
    stripe_subscription_id, cancel_at_period_end, episode_counter,
    current_case_id, latest_event_created_at, latest_source_event_id,
    latest_event_type, latest_payload
  ) values (
    requested_user_id, requested_stripe_account_id, requested_livemode,
    requested_stripe_customer_id, requested_stripe_subscription_id,
    case when requested_event_type = 'customer.subscription.deleted' then false else requested_cancel_at_period_end end,
    next_episode,
    case
      when transition_name in ('cancellation_reversed', 'subscription_terminated') then null
      else next_case_id
    end,
    requested_event_created_at, requested_source_event_id,
    requested_event_type, coalesce(requested_latest_payload, '{}'::jsonb)
  ) on conflict (user_id, stripe_account_id, livemode, stripe_subscription_id)
  do update set
    stripe_customer_id = excluded.stripe_customer_id,
    cancel_at_period_end = excluded.cancel_at_period_end,
    episode_counter = excluded.episode_counter,
    current_case_id = excluded.current_case_id,
    latest_event_created_at = excluded.latest_event_created_at,
    latest_source_event_id = excluded.latest_source_event_id,
    latest_event_type = excluded.latest_event_type,
    latest_payload = excluded.latest_payload,
    updated_at = timezone('utc'::text, now());

  if next_case_id is not null and transition_name in (
    'cancellation_scheduled', 'cancellation_updated',
    'cancellation_reversed', 'subscription_terminated'
  ) then
    insert into public.cancellation_case_events (
      user_id, cancellation_case_id, stripe_account_id, livemode,
      stripe_subscription_id, source, source_event_id, event_type,
      transition, previous_status, next_status, occurred_at, evidence
    ) values (
      requested_user_id, next_case_id, requested_stripe_account_id,
      requested_livemode, requested_stripe_subscription_id,
      requested_source, requested_source_event_id, requested_event_type,
      transition_name, previous_status, coalesce(next_status, 'shadow'),
      requested_event_created_at,
      jsonb_build_object(
        'cancel_at_period_end', requested_cancel_at_period_end,
        'cancel_at', requested_cancel_at,
        'current_period_end', requested_current_period_end,
        'subscription_status', requested_subscription_status
      )
    ) on conflict (user_id, stripe_account_id, livemode, source, source_event_id)
      do nothing;
  end if;

  return query
  select transition_name, next_case_id, next_episode,
    case when next_case_id is null then null else coalesce(next_status, current_case.status, 'shadow') end;
end;
$$;

revoke all on function public.record_cancellation_subscription_event(
  uuid, text, boolean, text, text, text, text, text, timestamptz,
  boolean, timestamptz, timestamptz, timestamptz, text, text, bigint,
  text, integer, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_cancellation_subscription_event(
  uuid, text, boolean, text, text, text, text, text, timestamptz,
  boolean, timestamptz, timestamptz, timestamptz, text, text, bigint,
  text, integer, text, text, text, text, jsonb
) to service_role;

revoke insert, update, delete on table public.cancellation_case_events
  from public, anon, authenticated;
grant select, insert on table public.cancellation_case_events to service_role;
grant select, insert, update on table public.cancellation_rescue_settings to service_role;
grant select, insert, update on table public.cancellation_subscription_states to service_role;
grant select, insert, update on table public.cancellation_cases to service_role;
