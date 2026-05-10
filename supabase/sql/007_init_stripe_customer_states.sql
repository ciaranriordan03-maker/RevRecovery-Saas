create table if not exists public.stripe_customer_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  subscription_status text,
  payment_method_updated_at timestamptz,
  subscription_updated_at timestamptz,
  subscription_deleted_at timestamptz,
  latest_event_type text not null,
  latest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (stripe_account_id, stripe_customer_id)
);

create index if not exists stripe_customer_states_user_idx
on public.stripe_customer_states (user_id);

create index if not exists stripe_customer_states_subscription_idx
on public.stripe_customer_states (stripe_subscription_id);

create index if not exists stripe_customer_states_status_idx
on public.stripe_customer_states (subscription_status);

alter table public.stripe_customer_states enable row level security;

drop trigger if exists stripe_customer_states_set_updated_at on public.stripe_customer_states;
create trigger stripe_customer_states_set_updated_at
before update on public.stripe_customer_states
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own Stripe customer states" on public.stripe_customer_states;
create policy "Users can view their own Stripe customer states"
on public.stripe_customer_states
for select
to authenticated
using (auth.uid() = user_id);
