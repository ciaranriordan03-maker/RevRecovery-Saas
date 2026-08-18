create table if not exists public.recovery_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  failed_payment_id uuid not null unique references public.failed_payments(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text,
  stripe_invoice_id text not null,
  status text not null default 'active',
  current_step integer not null default 1,
  started_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists recovery_sequences_user_status_idx
on public.recovery_sequences (user_id, status);

create index if not exists recovery_sequences_invoice_idx
on public.recovery_sequences (stripe_invoice_id);

alter table public.recovery_sequences enable row level security;

drop trigger if exists recovery_sequences_set_updated_at on public.recovery_sequences;
create trigger recovery_sequences_set_updated_at
before update on public.recovery_sequences
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own recovery sequences" on public.recovery_sequences;
create policy "Users can view their own recovery sequences"
on public.recovery_sequences
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.recovery_messages (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.recovery_sequences(id) on delete cascade,
  failed_payment_id uuid not null references public.failed_payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_key text not null,
  channel text not null default 'email',
  step_number integer not null,
  subject text,
  body_preview text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  canceled_at timestamptz,
  status text not null default 'pending',
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (sequence_id, message_key)
);

create index if not exists recovery_messages_user_status_idx
on public.recovery_messages (user_id, status);

create index if not exists recovery_messages_schedule_idx
on public.recovery_messages (scheduled_for, status);

create index if not exists recovery_messages_failed_payment_idx
on public.recovery_messages (failed_payment_id);

alter table public.recovery_messages enable row level security;

drop trigger if exists recovery_messages_set_updated_at on public.recovery_messages;
create trigger recovery_messages_set_updated_at
before update on public.recovery_messages
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own recovery messages" on public.recovery_messages;
create policy "Users can view their own recovery messages"
on public.recovery_messages
for select
to authenticated
using (auth.uid() = user_id);
