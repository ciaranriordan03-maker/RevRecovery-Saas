drop policy if exists "Users can view their own Stripe connections" on public.stripe_connections;
drop policy if exists "Users can insert their own Stripe connections" on public.stripe_connections;
drop policy if exists "Users can update their own Stripe connections" on public.stripe_connections;

revoke all on table public.stripe_connections from anon;
revoke all on table public.stripe_connections from authenticated;

comment on table public.stripe_connections is
  'Server-only Stripe Connect account metadata and encrypted OAuth tokens. Access through application API routes only.';
