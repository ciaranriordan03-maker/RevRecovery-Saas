begin;

-- A separate, dormant delivery path. Nothing here schedules mail or enables
-- Stripe rescue actions. One authorization and at most one attempt per case.
create table public.cancellation_test_email_controls (
  control_key text primary key check (control_key = 'test_email'),
  enabled boolean not null default false
);
insert into public.cancellation_test_email_controls (control_key) values ('test_email');

alter table public.cancellation_rescue_settings
  add column test_email_enabled boolean not null default false,
  add constraint cancellation_test_email_not_live
    check (not test_email_enabled or not livemode);

create table public.cancellation_test_email_authorizations (
  id uuid primary key default gen_random_uuid(),
  cancellation_case_id uuid not null unique references public.cancellation_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null default false check (not livemode),
  recipient_email text not null check (
    length(recipient_email) <= 254 and
    recipient_email ~ '^[a-z0-9][a-z0-9._+''-]*@[a-z0-9]+([.-][a-z0-9]+)*\.[a-z0-9]+$'
  ),
  sending_domain text not null,
  sender_verification_id text not null,
  sender_verified_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  fixture_version text not null check (fixture_version = 'cancellation_test_v1'),
  requester_id uuid not null,
  requested_at timestamptz not null,
  expires_at timestamptz not null check (
    expires_at > requested_at and expires_at <= requested_at + interval '15 minutes'
    and expires_at <= scheduled_end_at
  ),
  reviewer_id uuid check (reviewer_id <> requester_id),
  approved_at timestamptz,
  revoked_at timestamptz,
  claim_token uuid unique,
  reserved_at timestamptz,
  completed_at timestamptz,
  provider_message_id text unique check (provider_message_id ~ '^[a-zA-Z0-9_-]{1,128}$'),
  status text not null default 'pending_review' check (status in (
    'pending_review', 'approved', 'revoked', 'reserved', 'provider_accepted', 'outcome_unknown'
  )),
  check ((reviewer_id is null) = (approved_at is null)),
  check (approved_at is null or (approved_at >= requested_at and approved_at < expires_at)),
  check (status not in ('approved', 'reserved', 'provider_accepted', 'outcome_unknown') or approved_at is not null),
  check ((claim_token is null) = (reserved_at is null)),
  check (reserved_at is null or (reserved_at >= approved_at and reserved_at < expires_at)),
  check ((status in ('reserved', 'provider_accepted', 'outcome_unknown')) = (reserved_at is not null)),
  check ((status in ('provider_accepted', 'outcome_unknown')) = (completed_at is not null)),
  check ((status = 'provider_accepted') = (provider_message_id is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

-- Verified sender and current case state are read at request, review, and
-- reservation. The case row lock serializes with recorded Stripe transitions.
create function public.cancellation_test_email_context(
  requested_case_id uuid,
  requested_recipient text
)
returns table (
  case_user_id uuid, account_id text, domain text, sender_id text,
  verified_at timestamptz, scheduled_end timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select c.user_id, c.stripe_account_id, d.domain, d.provider_domain_id,
         d.verified_at, coalesce(c.cancel_at, c.current_period_end)
  from public.cancellation_cases c
  join public.stripe_connections sc on sc.user_id = c.user_id
    and sc.stripe_account_id = c.stripe_account_id and sc.livemode = false
    and sc.status = 'connected'
  join public.recovery_sending_domains d on d.user_id = c.user_id
    and d.status = 'verified' and d.verified_at is not null
    and nullif(btrim(d.provider_domain_id), '') is not null
  where c.id = requested_case_id and not c.livemode
    and c.status = 'shadow' and c.cancel_at_period_end
    and c.subscription_status in ('active', 'trialing', 'past_due', 'unpaid')
    and coalesce(c.cancel_at, c.current_period_end) > clock_timestamp()
    and not exists (
      select 1 from public.recovery_recipient_suppressions s
      where s.user_id = c.user_id and s.normalized_recipient_email = requested_recipient
    )
  for update of c
$$;

create function public.request_cancellation_test_email(
  requested_case_id uuid, requested_requester_id uuid, requested_recipient text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  authorization_id uuid;
  requested_time timestamptz;
  context record;
  recipient text := lower(btrim(requested_recipient));
begin
  if recipient is null or length(recipient) > 254
    or recipient !~ '^[a-z0-9][a-z0-9._+''-]*@[a-z0-9]+([.-][a-z0-9]+)*\.[a-z0-9]+$'
    or not exists (select 1 from auth.users where id = requested_requester_id) then return null;
  end if;
  select * into context from public.cancellation_test_email_context(requested_case_id, recipient);
  if not found then return null; end if;
  requested_time := clock_timestamp();
  if context.scheduled_end <= requested_time then return null; end if;

  insert into public.cancellation_test_email_authorizations (
    cancellation_case_id, user_id, stripe_account_id, recipient_email, sending_domain,
    sender_verification_id, sender_verified_at, scheduled_end_at, fixture_version,
    requester_id, requested_at, expires_at
  ) values (
    requested_case_id, context.case_user_id, context.account_id, recipient, context.domain,
    context.sender_id, context.verified_at, context.scheduled_end, 'cancellation_test_v1',
    requested_requester_id, requested_time, least(requested_time + interval '15 minutes', context.scheduled_end)
  ) on conflict (cancellation_case_id) do nothing
  returning id into authorization_id;
  return authorization_id;
end;
$$;

create function public.approve_cancellation_test_email(
  requested_authorization_id uuid, requested_reviewer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cancellation_test_email_authorizations a
  set status = 'approved', reviewer_id = requested_reviewer_id, approved_at = clock_timestamp()
  where a.id = requested_authorization_id and a.status = 'pending_review'
    and a.requester_id <> requested_reviewer_id and a.expires_at > clock_timestamp()
    and exists (select 1 from auth.users where id = requested_reviewer_id)
    and exists (
      select 1 from public.cancellation_test_email_context(a.cancellation_case_id, a.recipient_email) c
      where c.case_user_id = a.user_id and c.account_id = a.stripe_account_id
        and c.domain = a.sending_domain and c.sender_id = a.sender_verification_id
        and c.verified_at = a.sender_verified_at and c.scheduled_end = a.scheduled_end_at
    );
  return found;
end;
$$;

create function public.reserve_cancellation_test_email(
  requested_authorization_id uuid, requested_claim uuid,
  requested_recipient text, requested_fixture_version text
)
returns table (recipient_email text, sending_domain text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_claim is null then return; end if;
  -- UPDATE takes the authorization lock and rechecks status against concurrent
  -- claims. There is deliberately no lease/requeue or retry after reservation.
  return query
  update public.cancellation_test_email_authorizations a
  set status = 'reserved', claim_token = requested_claim, reserved_at = clock_timestamp()
  where a.id = requested_authorization_id and a.status = 'approved'
    and a.expires_at > clock_timestamp()
    and a.recipient_email = requested_recipient and a.fixture_version = requested_fixture_version
    and exists (
      select 1 from public.cancellation_test_email_controls g
      where g.control_key = 'test_email' and g.enabled
    )
    and exists (
      select 1 from public.cancellation_rescue_settings s
      where s.user_id = a.user_id and s.stripe_account_id = a.stripe_account_id
        and not s.livemode and s.mode = 'test' and s.test_email_enabled
    )
    and exists (
      select 1 from public.cancellation_test_email_context(a.cancellation_case_id, a.recipient_email) c
      where c.case_user_id = a.user_id and c.account_id = a.stripe_account_id
        and c.domain = a.sending_domain and c.sender_id = a.sender_verification_id
        and c.verified_at = a.sender_verified_at and c.scheduled_end = a.scheduled_end_at
    )
  returning a.recipient_email, a.sending_domain, a.expires_at;
end;
$$;

create function public.revoke_cancellation_test_email(requested_authorization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cancellation_test_email_authorizations a
  set status = 'revoked', revoked_at = clock_timestamp()
  where a.id = requested_authorization_id and a.status in ('pending_review', 'approved');
  return found;
end;
$$;

create function public.complete_cancellation_test_email(
  requested_authorization_id uuid, requested_claim uuid, requested_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cancellation_test_email_authorizations a
  set status = case when requested_provider_message_id is null then 'outcome_unknown'
                    else 'provider_accepted' end,
      provider_message_id = requested_provider_message_id, completed_at = clock_timestamp()
  where a.id = requested_authorization_id and a.status = 'reserved'
    and a.claim_token = requested_claim;
  return found;
end;
$$;

alter table public.cancellation_test_email_controls enable row level security;
alter table public.cancellation_test_email_authorizations enable row level security;
revoke all on table public.cancellation_test_email_controls, public.cancellation_test_email_authorizations
  from public, anon, authenticated, service_role;
grant select, update on public.cancellation_test_email_controls to service_role;
grant select on public.cancellation_test_email_authorizations to service_role;

revoke all on function public.cancellation_test_email_context(uuid, text),
  public.request_cancellation_test_email(uuid, uuid, text),
  public.approve_cancellation_test_email(uuid, uuid),
  public.reserve_cancellation_test_email(uuid, uuid, text, text),
  public.revoke_cancellation_test_email(uuid),
  public.complete_cancellation_test_email(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.request_cancellation_test_email(uuid, uuid, text),
  public.approve_cancellation_test_email(uuid, uuid),
  public.reserve_cancellation_test_email(uuid, uuid, text, text),
  public.revoke_cancellation_test_email(uuid),
  public.complete_cancellation_test_email(uuid, uuid, text)
  to service_role;

commit;
