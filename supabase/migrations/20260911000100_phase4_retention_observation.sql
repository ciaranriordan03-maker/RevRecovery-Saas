create table if not exists public.retention_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  status text not null,
  cancellation_type text,
  cancellation_reason text not null default 'unknown',
  cancellation_comment text,
  cancel_at_period_end boolean not null default false,
  cancellation_requested_at timestamptz,
  scheduled_cancellation_at timestamptz,
  actual_cancellation_at timestamptz,
  saved_at timestamptz,
  subscription_status text,
  recurring_amount integer,
  currency text,
  billing_interval text,
  billing_interval_count integer,
  stripe_price_id text,
  stripe_product_id text,
  opened_by_stripe_event_id text not null,
  latest_stripe_event_id text not null,
  last_event_created_at timestamptz not null,
  subscription_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retention_cases_status_check check (status in (
    'detected', 'intervention_pending', 'intervention_sent', 'saved', 'canceled',
    'suppressed', 'expired', 'closed_without_intervention'
  )),
  constraint retention_cases_cancellation_type_check check (
    cancellation_type is null or cancellation_type in ('immediate', 'scheduled')
  ),
  constraint retention_cases_cancellation_reason_check check (
    cancellation_reason in ('cancellation_requested', 'payment_disputed', 'payment_failed', 'unknown')
  )
);

create unique index if not exists retention_cases_open_subscription_uidx
on public.retention_cases (user_id, stripe_account_id, livemode, stripe_subscription_id)
where status in ('detected', 'intervention_pending', 'intervention_sent');

create index if not exists retention_cases_user_status_created_idx
on public.retention_cases (user_id, status, created_at desc);

create index if not exists retention_cases_subscription_history_idx
on public.retention_cases (stripe_account_id, livemode, stripe_subscription_id, created_at desc);

alter table public.retention_cases enable row level security;

drop policy if exists "Users can view their own retention cases" on public.retention_cases;
create policy "Users can view their own retention cases"
on public.retention_cases for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.retention_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.retention_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_event_type text not null,
  event_kind text not null,
  event_created_at timestamptz not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint retention_case_events_kind_check check (event_kind in (
    'cancellation_detected', 'cancellation_updated', 'cancellation_reversed',
    'subscription_canceled', 'stale_event_ignored'
  ))
);

create index if not exists retention_case_events_case_created_idx
on public.retention_case_events (case_id, event_created_at, created_at);

alter table public.retention_case_events enable row level security;

drop policy if exists "Users can view their own retention case events" on public.retention_case_events;
create policy "Users can view their own retention case events"
on public.retention_case_events for select to authenticated
using (auth.uid() = user_id);

create or replace function public.record_retention_subscription_event(
  requested_user_id uuid,
  requested_stripe_account_id text,
  requested_livemode boolean,
  requested_stripe_customer_id text,
  requested_stripe_subscription_id text,
  requested_stripe_event_id text,
  requested_event_type text,
  requested_event_created_at timestamptz,
  requested_disposition text,
  requested_cancellation_type text,
  requested_cancellation_reason text,
  requested_cancellation_comment text,
  requested_cancel_at_period_end boolean,
  requested_cancel_at timestamptz,
  requested_canceled_at timestamptz,
  requested_subscription_status text,
  requested_recurring_amount integer,
  requested_currency text,
  requested_interval text,
  requested_interval_count integer,
  requested_price_id text,
  requested_product_id text,
  requested_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_case public.retention_cases%rowtype;
  next_case_id uuid;
  next_event_kind text;
begin
  if requested_disposition not in ('active', 'cancellation_scheduled', 'canceled') then
    raise exception 'Unsupported retention disposition';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      requested_user_id::text || ':' || requested_stripe_account_id || ':' ||
      requested_livemode::text || ':' || requested_stripe_subscription_id,
      0
    )
  );

  select * into current_case
  from public.retention_cases
  where user_id = requested_user_id
    and stripe_account_id = requested_stripe_account_id
    and livemode = requested_livemode
    and stripe_subscription_id = requested_stripe_subscription_id
    and status in ('detected', 'intervention_pending', 'intervention_sent')
  order by created_at desc
  limit 1
  for update;

  if exists (
    select 1 from public.retention_case_events
    where stripe_event_id = requested_stripe_event_id
  ) then
    select case_id into next_case_id
    from public.retention_case_events
    where stripe_event_id = requested_stripe_event_id;
    return next_case_id;
  end if;

  if current_case.id is not null
    and requested_event_created_at < current_case.last_event_created_at then
    insert into public.retention_case_events (
      case_id, user_id, stripe_event_id, stripe_event_type, event_kind,
      event_created_at, payload_snapshot
    ) values (
      current_case.id, requested_user_id, requested_stripe_event_id,
      requested_event_type, 'stale_event_ignored', requested_event_created_at,
      requested_payload
    );
    return current_case.id;
  end if;

  if requested_disposition = 'active' then
    if current_case.id is null then
      return null;
    end if;

    update public.retention_cases
    set status = case
          when current_case.status = 'intervention_sent' then 'saved'
          else 'closed_without_intervention'
        end,
        saved_at = requested_event_created_at,
        subscription_status = requested_subscription_status,
        latest_stripe_event_id = requested_stripe_event_id,
        last_event_created_at = requested_event_created_at,
        subscription_snapshot = requested_payload,
        updated_at = now()
    where id = current_case.id;

    next_case_id := current_case.id;
    next_event_kind := 'cancellation_reversed';
  elsif requested_disposition = 'cancellation_scheduled' then
    if current_case.id is null then
      insert into public.retention_cases (
        user_id, stripe_account_id, livemode, stripe_customer_id,
        stripe_subscription_id, status, cancellation_type, cancellation_reason,
        cancellation_comment, cancel_at_period_end, cancellation_requested_at,
        scheduled_cancellation_at, subscription_status, recurring_amount,
        currency, billing_interval, billing_interval_count, stripe_price_id,
        stripe_product_id, opened_by_stripe_event_id, latest_stripe_event_id,
        last_event_created_at, subscription_snapshot
      ) values (
        requested_user_id, requested_stripe_account_id, requested_livemode,
        requested_stripe_customer_id, requested_stripe_subscription_id,
        'detected', requested_cancellation_type, requested_cancellation_reason,
        requested_cancellation_comment, requested_cancel_at_period_end,
        requested_event_created_at, requested_cancel_at,
        requested_subscription_status, requested_recurring_amount,
        requested_currency, requested_interval, requested_interval_count,
        requested_price_id, requested_product_id,
        requested_stripe_event_id, requested_stripe_event_id,
        requested_event_created_at, requested_payload
      ) returning id into next_case_id;
      next_event_kind := 'cancellation_detected';
    else
      update public.retention_cases
      set cancellation_type = requested_cancellation_type,
          cancellation_reason = requested_cancellation_reason,
          cancellation_comment = requested_cancellation_comment,
          cancel_at_period_end = requested_cancel_at_period_end,
          scheduled_cancellation_at = requested_cancel_at,
          subscription_status = requested_subscription_status,
          recurring_amount = requested_recurring_amount,
          currency = requested_currency,
          billing_interval = requested_interval,
          billing_interval_count = requested_interval_count,
          stripe_price_id = requested_price_id,
          stripe_product_id = requested_product_id,
          latest_stripe_event_id = requested_stripe_event_id,
          last_event_created_at = requested_event_created_at,
          subscription_snapshot = requested_payload,
          updated_at = now()
      where id = current_case.id;
      next_case_id := current_case.id;
      next_event_kind := 'cancellation_updated';
    end if;
  else
    if current_case.id is null then
      insert into public.retention_cases (
        user_id, stripe_account_id, livemode, stripe_customer_id,
        stripe_subscription_id, status, cancellation_type, cancellation_reason,
        cancellation_comment, cancel_at_period_end, cancellation_requested_at,
        actual_cancellation_at, subscription_status, recurring_amount,
        currency, billing_interval, billing_interval_count, stripe_price_id,
        stripe_product_id, opened_by_stripe_event_id, latest_stripe_event_id,
        last_event_created_at, subscription_snapshot
      ) values (
        requested_user_id, requested_stripe_account_id, requested_livemode,
        requested_stripe_customer_id, requested_stripe_subscription_id,
        'canceled', requested_cancellation_type, requested_cancellation_reason,
        requested_cancellation_comment, requested_cancel_at_period_end,
        requested_event_created_at, coalesce(requested_canceled_at, requested_event_created_at),
        requested_subscription_status, requested_recurring_amount,
        requested_currency, requested_interval, requested_interval_count,
        requested_price_id, requested_product_id,
        requested_stripe_event_id, requested_stripe_event_id,
        requested_event_created_at, requested_payload
      ) returning id into next_case_id;
    else
      update public.retention_cases
      set status = 'canceled',
          actual_cancellation_at = coalesce(requested_canceled_at, requested_event_created_at),
          subscription_status = requested_subscription_status,
          latest_stripe_event_id = requested_stripe_event_id,
          last_event_created_at = requested_event_created_at,
          subscription_snapshot = requested_payload,
          updated_at = now()
      where id = current_case.id
      returning id into next_case_id;
    end if;
    next_event_kind := 'subscription_canceled';
  end if;

  insert into public.retention_case_events (
    case_id, user_id, stripe_event_id, stripe_event_type, event_kind,
    event_created_at, payload_snapshot
  ) values (
    next_case_id, requested_user_id, requested_stripe_event_id,
    requested_event_type, next_event_kind, requested_event_created_at,
    requested_payload
  );

  return next_case_id;
end;
$$;

revoke all on function public.record_retention_subscription_event(
  uuid, text, boolean, text, text, text, text, timestamptz, text, text,
  text, text, boolean, timestamptz, timestamptz, text, integer, text,
  text, integer, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.record_retention_subscription_event(
  uuid, text, boolean, text, text, text, text, timestamptz, text, text,
  text, text, boolean, timestamptz, timestamptz, text, integer, text,
  text, integer, text, text, jsonb
) to service_role;
