begin;

-- Phase 2 foundation for merchant-branded recovery email. Creating or
-- verifying provider domains remains a server-side concern in a later batch;
-- this migration does not change the current platform sender.
create table if not exists public.recovery_sending_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  provider text not null default 'resend' check (provider = 'resend'),
  provider_domain_id text,
  status text not null default 'pending' check (
    status in ('pending', 'verified', 'failed', 'disabled')
  ),
  dns_records jsonb not null default '[]'::jsonb,
  failure_reason text,
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id),
  unique (domain),
  check (domain = lower(btrim(domain)) and length(domain) > 0),
  check (jsonb_typeof(dns_records) = 'array')
);

create unique index if not exists recovery_sending_domains_provider_id_idx
on public.recovery_sending_domains (provider, provider_domain_id)
where provider_domain_id is not null;

create index if not exists recovery_sending_domains_status_idx
on public.recovery_sending_domains (status, updated_at desc);

alter table public.recovery_sending_domains enable row level security;

drop policy if exists "Users can view their own recovery sending domain"
on public.recovery_sending_domains;

create policy "Users can view their own recovery sending domain"
on public.recovery_sending_domains
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.recovery_sending_domains from anon;
revoke insert, update, delete on table public.recovery_sending_domains from authenticated;
grant select on table public.recovery_sending_domains to authenticated;
grant select, insert, update, delete on table public.recovery_sending_domains to service_role;

commit;
