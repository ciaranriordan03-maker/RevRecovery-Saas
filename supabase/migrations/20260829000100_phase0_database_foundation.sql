begin;

-- Phase 0 foundation: additive fields only. Application behavior is switched in
-- later batches after existing production rows have been backfilled.
alter table public.stripe_webhook_events
  add column if not exists event_created_at timestamptz,
  add column if not exists processing_attempt_count integer not null default 0,
  add column if not exists first_attempted_at timestamptz,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_details jsonb not null default '{}'::jsonb,
  add column if not exists ignored_reason text;

create index if not exists stripe_webhook_events_retry_idx
on public.stripe_webhook_events (status, next_attempt_at, claim_expires_at);

create index if not exists stripe_webhook_events_account_created_idx
on public.stripe_webhook_events (stripe_account_id, livemode, event_created_at);

create table if not exists public.stripe_webhook_attempts (
  id uuid primary key default gen_random_uuid(),
  webhook_event_id uuid not null references public.stripe_webhook_events(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  claim_token uuid,
  outcome text not null check (outcome in ('processing', 'processed', 'failed', 'ignored', 'lease_expired')),
  error_code text,
  error_details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc'::text, now()),
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (webhook_event_id, attempt_number)
);

create index if not exists stripe_webhook_attempts_event_idx
on public.stripe_webhook_attempts (webhook_event_id, attempt_number desc);

alter table public.stripe_webhook_attempts enable row level security;

alter table public.failed_payments
  add column if not exists livemode boolean,
  add column if not exists case_status text,
  add column if not exists state_version integer not null default 0,
  add column if not exists latest_stripe_event_id text,
  add column if not exists latest_event_created_at timestamptz,
  add column if not exists terminal_reason text,
  add column if not exists terminal_at timestamptz,
  add column if not exists outreach_paused_at timestamptz,
  add column if not exists outreach_resume_after timestamptz,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_product_id text,
  add column if not exists invoice_kind text,
  add column if not exists billing_reason text,
  add column if not exists billing_interval text,
  add column if not exists invoice_status text,
  add column if not exists amount_paid bigint,
  add column if not exists failure_code text,
  add column if not exists decline_code text,
  add column if not exists failure_category text,
  add column if not exists failure_message text,
  add column if not exists policy_version_id uuid,
  add column if not exists policy_snapshot jsonb not null default '{}'::jsonb;

create index if not exists failed_payments_account_mode_status_idx
on public.failed_payments (stripe_account_id, livemode, case_status);

create index if not exists failed_payments_subscription_idx
on public.failed_payments (stripe_account_id, livemode, stripe_subscription_id);

create index if not exists failed_payments_payment_intent_idx
on public.failed_payments (stripe_payment_intent_id);

create table if not exists public.recovery_case_transitions (
  id uuid primary key default gen_random_uuid(),
  failed_payment_id uuid not null references public.failed_payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_event_id text,
  from_status text,
  to_status text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists recovery_case_transitions_case_idx
on public.recovery_case_transitions (failed_payment_id, created_at);

alter table public.recovery_case_transitions enable row level security;

alter table public.stripe_customer_states
  add column if not exists livemode boolean,
  add column if not exists latest_stripe_event_id text,
  add column if not exists latest_event_created_at timestamptz;

create index if not exists stripe_customer_states_account_mode_customer_idx
on public.stripe_customer_states (stripe_account_id, livemode, stripe_customer_id);

create table if not exists public.recovery_account_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_connection_id uuid not null references public.stripe_connections(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  recovery_mode text not null default 'off'
    check (recovery_mode in ('off', 'test', 'live', 'paused')),
  approved_test_recipient text,
  timezone text not null default 'UTC',
  paused_at timestamptz,
  paused_reason text,
  active_policy_version_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (stripe_connection_id),
  unique (stripe_account_id, livemode)
);

alter table public.recovery_account_settings enable row level security;

drop trigger if exists recovery_account_settings_set_updated_at on public.recovery_account_settings;
create trigger recovery_account_settings_set_updated_at
before update on public.recovery_account_settings
for each row execute function public.handle_updated_at();

create policy "Users can view their own recovery account settings"
on public.recovery_account_settings for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.recovery_policy_versions (
  id uuid primary key default gen_random_uuid(),
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  timezone text not null,
  configuration jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (account_settings_id, version)
);

alter table public.recovery_policy_versions enable row level security;

create policy "Users can view their own recovery policy versions"
on public.recovery_policy_versions for select to authenticated
using (exists (
  select 1 from public.recovery_account_settings settings
  where settings.id = account_settings_id and settings.user_id = auth.uid()
));

create table if not exists public.recovery_policy_steps (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.recovery_policy_versions(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  offset_minutes integer not null check (offset_minutes >= 0),
  channel text not null default 'email' check (channel = 'email'),
  subject_template text,
  body_template text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (policy_version_id, step_number)
);

alter table public.recovery_policy_steps enable row level security;

create policy "Users can view their own recovery policy steps"
on public.recovery_policy_steps for select to authenticated
using (exists (
  select 1
  from public.recovery_policy_versions versions
  join public.recovery_account_settings settings on settings.id = versions.account_settings_id
  where versions.id = policy_version_id and settings.user_id = auth.uid()
));

alter table public.recovery_account_settings
  add constraint recovery_account_settings_active_policy_fkey
  foreign key (active_policy_version_id) references public.recovery_policy_versions(id) on delete set null;

alter table public.failed_payments
  add constraint failed_payments_policy_version_fkey
  foreign key (policy_version_id) references public.recovery_policy_versions(id) on delete set null;

alter table public.recovery_sequences
  add column if not exists policy_version_id uuid references public.recovery_policy_versions(id) on delete set null,
  add column if not exists configuration_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists exhausted_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists terminal_reason text;

alter table public.recovery_messages
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempted_at timestamptz,
  add column if not exists send_attempt_count integer not null default 0,
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists delivery_generation integer not null default 1,
  add column if not exists provider_idempotency_key text,
  add column if not exists provider_accepted_at timestamptz,
  add column if not exists terminal_failed_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failure_details jsonb not null default '{}'::jsonb,
  add column if not exists replay_requested_at timestamptz,
  add column if not exists replay_requested_by uuid references auth.users(id) on delete set null;

create unique index if not exists recovery_messages_provider_idempotency_idx
on public.recovery_messages (provider_idempotency_key)
where provider_idempotency_key is not null;

create index if not exists recovery_messages_claimable_idx
on public.recovery_messages (status, next_attempt_at, scheduled_for, claim_expires_at);

create table if not exists public.recovery_message_attempts (
  id uuid primary key default gen_random_uuid(),
  recovery_message_id uuid not null references public.recovery_messages(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  delivery_generation integer not null default 1,
  claim_token uuid,
  outcome text not null check (outcome in ('claimed', 'accepted', 'sent', 'failed_retryable', 'failed_terminal', 'lease_expired')),
  provider_message_id text,
  error_code text,
  error_details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc'::text, now()),
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (recovery_message_id, delivery_generation, attempt_number)
);

create index if not exists recovery_message_attempts_message_idx
on public.recovery_message_attempts (recovery_message_id, created_at);

alter table public.recovery_message_attempts enable row level security;

-- Constraints are NOT VALID so legacy production rows can be audited and
-- backfilled before validation. They still protect all new/updated rows.
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_v2_check
  check (status in ('received', 'processing', 'processed', 'failed', 'ignored')) not valid;

alter table public.failed_payments
  add constraint failed_payments_case_status_check
  check (case_status is null or case_status in (
    'detected', 'active', 'awaiting_retry', 'payment_method_updated',
    'recovered', 'exhausted', 'canceled_by_merchant',
    'no_longer_applicable', 'failed_operationally'
  )) not valid;

alter table public.failed_payments
  add constraint failed_payments_invoice_kind_check
  check (invoice_kind is null or invoice_kind in ('subscription', 'standalone', 'unknown')) not valid;

alter table public.recovery_sequences
  add constraint recovery_sequences_status_v2_check
  check (status in (
    'detected', 'active', 'awaiting_retry', 'payment_method_updated',
    'recovered', 'exhausted', 'canceled_by_merchant',
    'no_longer_applicable', 'failed_operationally'
  )) not valid;

alter table public.recovery_messages
  add constraint recovery_messages_status_v2_check
  check (status in (
    'pending', 'scheduled', 'claimed', 'sent', 'canceled', 'failed',
    'failed_retryable', 'failed_terminal', 'paused'
  )) not valid;

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
begin
  return query
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
      last_error_details = '{}'::jsonb
  where event.stripe_event_id = requested_event_id
    and (
      (event.status in ('received', 'failed') and (event.next_attempt_at is null or event.next_attempt_at <= timezone('utc'::text, now())))
      or (event.status = 'processing' and event.claim_expires_at < timezone('utc'::text, now()))
    )
  returning event.*;
end;
$$;

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
  )
  update public.recovery_messages as message
  set status = 'claimed',
      claim_token = requested_claim_token,
      claimed_at = timezone('utc'::text, now()),
      claim_expires_at = timezone('utc'::text, now()) + make_interval(secs => greatest(lease_seconds, 1)),
      last_attempted_at = timezone('utc'::text, now())
  from claimable
  where message.id = claimable.id
  returning message.*;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, uuid, integer) to service_role;
revoke all on function public.claim_due_recovery_messages(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_recovery_messages(uuid, integer, integer) to service_role;

commit;
