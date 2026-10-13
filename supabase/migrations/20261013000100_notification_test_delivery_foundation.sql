begin;

alter table public.recovery_account_settings
  add column if not exists essential_notifications_delivery_mode text not null default 'disabled',
  add column if not exists essential_notification_test_recipient text;

alter table public.recovery_account_settings
  drop constraint if exists recovery_account_settings_notification_delivery_mode_check;

alter table public.recovery_account_settings
  add constraint recovery_account_settings_notification_delivery_mode_check
  check (essential_notifications_delivery_mode in ('disabled', 'test'));

alter table public.recovery_notification_events
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists provider_message_id text;

alter table public.recovery_notification_events
  drop constraint if exists recovery_notification_events_claim_state_check;

alter table public.recovery_notification_events
  add constraint recovery_notification_events_claim_state_check
  check (
    (claim_token is null and claimed_at is null) or
    (claim_token is not null and claimed_at is not null and status = 'queued')
  );

create unique index if not exists recovery_notification_events_claim_token_unique
on public.recovery_notification_events (claim_token)
where claim_token is not null;

create table if not exists public.recovery_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.recovery_notification_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('blocked', 'claimed', 'sent', 'failed')),
  reason_code text not null,
  recipient_email text not null,
  provider_message_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists recovery_notification_delivery_attempts_event_created_idx
on public.recovery_notification_delivery_attempts (event_id, created_at desc);

alter table public.recovery_notification_delivery_attempts enable row level security;

create policy "Users can view their own notification delivery attempts"
on public.recovery_notification_delivery_attempts for select to authenticated
using (auth.uid() = user_id);

commit;
