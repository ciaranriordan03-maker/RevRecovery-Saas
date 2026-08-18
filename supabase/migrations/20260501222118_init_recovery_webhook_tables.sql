create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_account_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  livemode boolean not null default false,
  payload jsonb not null,
  status text not null default 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.stripe_webhook_events enable row level security;

drop trigger if exists stripe_webhook_events_set_updated_at on public.stripe_webhook_events;
create trigger stripe_webhook_events_set_updated_at
before update on public.stripe_webhook_events
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own Stripe webhook events" on public.stripe_webhook_events;
create policy "Users can view their own Stripe webhook events"
on public.stripe_webhook_events
for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.failed_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text not null unique,
  amount_due bigint not null default 0,
  currency text,
  attempt_count integer not null default 0,
  next_payment_attempt_at timestamptz,
  status text not null,
  recovery_stage text not null default 'pending',
  recovered_at timestamptz,
  last_event_type text not null,
  latest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.failed_payments enable row level security;

drop trigger if exists failed_payments_set_updated_at on public.failed_payments;
create trigger failed_payments_set_updated_at
before update on public.failed_payments
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own failed payments" on public.failed_payments;
create policy "Users can view their own failed payments"
on public.failed_payments
for select
to authenticated
using (auth.uid() = user_id);
