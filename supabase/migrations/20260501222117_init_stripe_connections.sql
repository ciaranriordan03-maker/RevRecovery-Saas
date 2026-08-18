create table if not exists public.stripe_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  access_token text not null,
  refresh_token text,
  connected_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'connected',
  account_email text,
  account_display_name text,
  scope text,
  livemode boolean,
  last_synced_at timestamptz,
  sync_summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.stripe_connections enable row level security;

drop trigger if exists stripe_connections_set_updated_at on public.stripe_connections;

create trigger stripe_connections_set_updated_at
before update on public.stripe_connections
for each row
execute function public.handle_updated_at();

drop policy if exists "Users can view their own Stripe connections" on public.stripe_connections;
create policy "Users can view their own Stripe connections"
on public.stripe_connections
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Stripe connections" on public.stripe_connections;
create policy "Users can insert their own Stripe connections"
on public.stripe_connections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Stripe connections" on public.stripe_connections;
create policy "Users can update their own Stripe connections"
on public.stripe_connections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
