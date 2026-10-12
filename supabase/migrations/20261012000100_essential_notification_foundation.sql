begin;

alter table public.recovery_account_settings
  add column if not exists essential_notifications_enabled boolean not null default false;

create table if not exists public.recovery_notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  rule_id text not null check (
    rule_id in ('webhook_failure', 'sending_domain_failure', 'attention_digest')
  ),
  severity text not null check (severity in ('critical', 'warning')),
  fingerprint text not null,
  deduplication_key text not null,
  status text not null default 'recorded' check (
    status in ('recorded', 'suppressed', 'queued', 'sent', 'failed')
  ),
  recipient_email text not null,
  occurred_at timestamptz not null,
  cooldown_until timestamptz not null,
  delivery_enabled_snapshot boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint recovery_notification_events_deduplication_key_unique
    unique (deduplication_key),
  constraint recovery_notification_events_cooldown_check
    check (cooldown_until > occurred_at),
  constraint recovery_notification_events_sent_state_check
    check (
      status <> 'sent' or
      (delivery_enabled_snapshot = true and sent_at is not null)
    )
);

create index if not exists recovery_notification_events_user_created_idx
on public.recovery_notification_events (user_id, created_at desc);

create index if not exists recovery_notification_events_unresolved_idx
on public.recovery_notification_events (account_settings_id, rule_id, cooldown_until)
where status in ('recorded', 'queued', 'failed');

alter table public.recovery_notification_events enable row level security;

create policy "Users can view their own recovery notification events"
on public.recovery_notification_events for select to authenticated
using (auth.uid() = user_id);

commit;
