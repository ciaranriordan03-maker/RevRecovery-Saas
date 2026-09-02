begin;

-- Phase 2 foundation: retain verified provider delivery events without changing
-- recovery behavior. Later batches can project these immutable facts into
-- merchant-facing delivery state and analytics.
create table if not exists public.recovery_message_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend' check (provider = 'resend'),
  provider_event_id text not null,
  provider_event_type text not null,
  event_type text not null check (
    event_type in (
      'scheduled',
      'sent',
      'delivered',
      'delivery_delayed',
      'bounced',
      'complained',
      'opened',
      'clicked',
      'failed',
      'suppressed',
      'canceled',
      'unknown'
    )
  ),
  provider_message_id text not null,
  recovery_message_id uuid references public.recovery_messages(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (provider, provider_event_id)
);

create index if not exists recovery_message_events_provider_message_idx
on public.recovery_message_events (provider, provider_message_id, occurred_at desc);

create index if not exists recovery_message_events_message_idx
on public.recovery_message_events (recovery_message_id, occurred_at desc);

create index if not exists recovery_message_events_user_idx
on public.recovery_message_events (user_id, occurred_at desc);

alter table public.recovery_message_events enable row level security;

drop policy if exists "Users can view their own recovery message events"
on public.recovery_message_events;

create policy "Users can view their own recovery message events"
on public.recovery_message_events
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.recovery_message_events from anon;
revoke insert, update, delete on table public.recovery_message_events from authenticated;
grant select on table public.recovery_message_events to authenticated;
grant select, insert on table public.recovery_message_events to service_role;

commit;
