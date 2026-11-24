begin;

-- One identity shared by the send receipt and signed evidence. Never rebind it.
create table public.cancellation_test_email_provider_bindings (
  authorization_id uuid primary key references public.cancellation_test_email_authorizations(id) on delete cascade,
  provider_message_id text not null unique check (provider_message_id ~ '^[a-zA-Z0-9_-]{1,128}$'),
  unique (authorization_id, provider_message_id)
);

insert into public.cancellation_test_email_provider_bindings (authorization_id, provider_message_id)
select id, provider_message_id from public.cancellation_test_email_authorizations
where provider_message_id is not null;

create table public.cancellation_test_email_evidence (
  provider_event_id text primary key check (provider_event_id ~ '^[a-zA-Z0-9_-]{1,255}$'),
  authorization_id uuid not null,
  provider_message_id text not null,
  provider_created_at timestamptz not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  event_kind text not null check (event_kind in (
    'sent', 'delivery_delayed', 'delivered', 'bounced', 'failed', 'suppressed', 'complained'
  )),
  suppression_reason text check (suppression_reason in ('bounced', 'suppressed', 'complained')),
  check (occurred_at >= provider_created_at),
  check (suppression_reason is null or suppression_reason = event_kind),
  check (event_kind not in ('suppressed', 'complained') or suppression_reason is not distinct from event_kind),
  foreign key (authorization_id, provider_message_id)
    references public.cancellation_test_email_provider_bindings(authorization_id, provider_message_id) on delete cascade
);
create index cancellation_test_email_evidence_authorization_idx
  on public.cancellation_test_email_evidence (authorization_id, occurred_at);

-- Durable read model independent of webhook arrival order. It never marks a
-- subscription rescued, edits payment recovery, or changes send eligibility.
create view public.cancellation_test_email_delivery_evidence
with (security_invoker = true)
as
select distinct on (e.authorization_id)
  e.authorization_id, e.provider_message_id, e.event_kind as delivery_status,
  e.suppression_reason, e.occurred_at, e.provider_event_id
from public.cancellation_test_email_evidence e
order by e.authorization_id, (e.suppression_reason is not null) desc,
  case e.event_kind
    when 'complained' then 6 when 'suppressed' then 5 when 'failed' then 4
    when 'delivered' then 3 when 'bounced' then 2 when 'delivery_delayed' then 1 else 0
  end desc, e.occurred_at desc, e.provider_event_id;

create function public.bind_cancellation_test_email_provider(
  requested_authorization_id uuid, requested_provider_message_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.cancellation_test_email_provider_bindings (authorization_id, provider_message_id)
    values (requested_authorization_id, requested_provider_message_id)
    on conflict do nothing;
  return exists (
    select 1 from public.cancellation_test_email_provider_bindings b
    where b.authorization_id = requested_authorization_id
      and b.provider_message_id = requested_provider_message_id
  );
end;
$$;

-- The same authorization row lock protects both receipt completion and
-- evidence ingestion. Evidence can arrive before the HTTP receipt is saved.
create or replace function public.complete_cancellation_test_email(
  requested_authorization_id uuid, requested_claim uuid, requested_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.cancellation_test_email_authorizations a
  where a.id = requested_authorization_id and not a.livemode and a.status = 'reserved'
    and a.claim_token = requested_claim
  for update;
  if not found then return false; end if;

  if requested_provider_message_id is not null and (
    requested_provider_message_id !~ '^[a-zA-Z0-9_-]{1,128}$' or
    not public.bind_cancellation_test_email_provider(requested_authorization_id, requested_provider_message_id)
  ) then return false; end if;

  update public.cancellation_test_email_authorizations
  set status = case when requested_provider_message_id is null then 'outcome_unknown'
                    else 'provider_accepted' end,
      provider_message_id = requested_provider_message_id, completed_at = clock_timestamp()
  where id = requested_authorization_id;
  return found;
end;
$$;

-- Called only with sanitized facts from the server's dedicated signature
-- verifier. Recheck the immutable envelope and time window under the lock.
create function public.record_cancellation_test_email_evidence(
  requested_authorization_id uuid, requested_event_id text, requested_provider_message_id text,
  requested_recipient text, requested_sending_domain text, requested_provider_created_at timestamptz,
  requested_occurred_at timestamptz, requested_event_kind text, requested_suppression_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.cancellation_test_email_authorizations%rowtype;
  prior public.cancellation_test_email_evidence%rowtype;
begin
  if requested_event_id is null or requested_event_id !~ '^[a-zA-Z0-9_-]{1,255}$'
    or requested_provider_message_id is null or requested_provider_message_id !~ '^[a-zA-Z0-9_-]{1,128}$'
    or requested_provider_created_at is null or not isfinite(requested_provider_created_at)
    or requested_occurred_at is null or not isfinite(requested_occurred_at)
    or requested_occurred_at < requested_provider_created_at
    or requested_event_kind is null or requested_event_kind not in (
      'sent', 'delivery_delayed', 'delivered', 'bounced', 'failed', 'suppressed', 'complained'
    )
    or (requested_suppression_reason is not null and (
      requested_suppression_reason not in ('bounced', 'suppressed', 'complained')
      or requested_suppression_reason <> requested_event_kind
    ))
    or (requested_event_kind in ('suppressed', 'complained')
      and requested_suppression_reason is distinct from requested_event_kind)
  then return 'invalid'; end if;

  select a.* into attempt from public.cancellation_test_email_authorizations a
  where a.id = requested_authorization_id
  for update;
  if not found or attempt.livemode
    or attempt.status not in ('reserved', 'outcome_unknown', 'provider_accepted')
    or attempt.fixture_version <> 'cancellation_test_v1'
    or attempt.recipient_email is distinct from requested_recipient
    or attempt.sending_domain is distinct from requested_sending_domain
    -- Provider payload timestamps arrive through JS at millisecond precision.
    or requested_provider_created_at < date_trunc('milliseconds', attempt.reserved_at)
    or requested_provider_created_at > attempt.expires_at + interval '10 seconds'
  then return 'unmatched'; end if;
  if attempt.provider_message_id is not null and attempt.provider_message_id <> requested_provider_message_id
  then return 'conflict'; end if;

  begin
    if not public.bind_cancellation_test_email_provider(requested_authorization_id, requested_provider_message_id)
    then return 'conflict'; end if;

    insert into public.cancellation_test_email_evidence (
      provider_event_id, authorization_id, provider_message_id, provider_created_at,
      occurred_at, event_kind, suppression_reason
    ) values (
      requested_event_id, requested_authorization_id, requested_provider_message_id, requested_provider_created_at,
      requested_occurred_at, requested_event_kind, requested_suppression_reason
    );
    return 'recorded';
  exception when unique_violation then
    -- This subtransaction rolls back any provisional binding on a duplicate
    -- or conflicting provider event, including cross-attempt races.
    select e.* into prior from public.cancellation_test_email_evidence e
    where e.provider_event_id = requested_event_id;
    if found and prior.authorization_id = requested_authorization_id
      and prior.provider_message_id = requested_provider_message_id
      and prior.provider_created_at = requested_provider_created_at
      and prior.occurred_at = requested_occurred_at
      and prior.event_kind = requested_event_kind
      and prior.suppression_reason is not distinct from requested_suppression_reason
    then return 'duplicate'; end if;
    return 'conflict';
  end;
end;
$$;

alter table public.cancellation_test_email_provider_bindings enable row level security;
alter table public.cancellation_test_email_evidence enable row level security;
revoke all on public.cancellation_test_email_provider_bindings, public.cancellation_test_email_evidence,
  public.cancellation_test_email_delivery_evidence from public, anon, authenticated, service_role;
grant select on public.cancellation_test_email_provider_bindings, public.cancellation_test_email_evidence,
  public.cancellation_test_email_delivery_evidence to service_role;

revoke all on function public.bind_cancellation_test_email_provider(uuid, text),
  public.record_cancellation_test_email_evidence(uuid, text, text, text, text, timestamptz, timestamptz, text, text)
  from public, anon, authenticated, service_role;
grant execute on function
  public.record_cancellation_test_email_evidence(uuid, text, text, text, text, timestamptz, timestamptz, text, text)
  to service_role;

commit;
