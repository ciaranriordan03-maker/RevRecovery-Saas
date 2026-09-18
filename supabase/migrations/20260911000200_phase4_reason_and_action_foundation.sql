begin;

create table if not exists public.retention_account_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_connection_id uuid not null references public.stripe_connections(id) on delete cascade,
  observation_enabled boolean not null default true,
  support_action_enabled boolean not null default false,
  support_contact_email text,
  pause_action_enabled boolean not null default false,
  downgrade_action_enabled boolean not null default false,
  eligible_downgrade_price_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint retention_account_settings_user_connection_unique
    unique (user_id, stripe_connection_id),
  constraint retention_account_settings_support_email_check check (
    support_contact_email is null or length(support_contact_email) <= 320
  ),
  constraint retention_account_settings_support_configuration_check check (
    support_action_enabled = false or support_contact_email is not null
  ),
  constraint retention_account_settings_downgrade_configuration_check check (
    downgrade_action_enabled = false or cardinality(eligible_downgrade_price_ids) > 0
  )
);

alter table public.retention_account_settings enable row level security;

drop policy if exists "Users can view their own retention settings"
on public.retention_account_settings;
create policy "Users can view their own retention settings"
on public.retention_account_settings for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their own retention settings"
on public.retention_account_settings;
create policy "Users can update their own retention settings"
on public.retention_account_settings for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.retention_reason_responses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.retention_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason_code text not null,
  comment text,
  source text not null default 'customer',
  submitted_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint retention_reason_responses_case_unique unique (case_id),
  constraint retention_reason_responses_reason_check check (reason_code in (
    'too_expensive', 'missing_features', 'technical_issues', 'support_issues',
    'billing_issues', 'not_using_enough', 'temporary_pause',
    'switched_provider', 'business_closed', 'other', 'prefer_not_to_say'
  )),
  constraint retention_reason_responses_comment_length_check check (
    comment is null or length(comment) <= 1000
  ),
  constraint retention_reason_responses_other_comment_check check (
    reason_code <> 'other' or nullif(trim(comment), '') is not null
  ),
  constraint retention_reason_responses_source_check check (
    source in ('customer', 'merchant', 'imported')
  )
);

create index if not exists retention_reason_responses_user_submitted_idx
on public.retention_reason_responses (user_id, submitted_at desc);

alter table public.retention_reason_responses enable row level security;

drop policy if exists "Users can view their own retention reason responses"
on public.retention_reason_responses;
create policy "Users can view their own retention reason responses"
on public.retention_reason_responses for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.retention_action_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.retention_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  event_kind text not null,
  idempotency_key text not null unique,
  action_snapshot jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint retention_action_events_action_check check (action_type in (
    'support', 'pause', 'downgrade', 'continue_canceling'
  )),
  constraint retention_action_events_kind_check check (event_kind in (
    'presented', 'accepted', 'rejected', 'abandoned',
    'execution_requested', 'execution_failed', 'verified'
  ))
);

create index if not exists retention_action_events_case_occurred_idx
on public.retention_action_events (case_id, occurred_at, created_at);

create index if not exists retention_action_events_user_kind_occurred_idx
on public.retention_action_events (user_id, event_kind, occurred_at desc);

alter table public.retention_action_events enable row level security;

drop policy if exists "Users can view their own retention action events"
on public.retention_action_events;
create policy "Users can view their own retention action events"
on public.retention_action_events for select to authenticated
using (auth.uid() = user_id);

insert into public.retention_account_settings (
  user_id,
  stripe_connection_id,
  observation_enabled
)
select
  connection.user_id,
  connection.id,
  true
from public.stripe_connections as connection
on conflict (user_id, stripe_connection_id) do nothing;

commit;
