begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.recovery_notification_quarantine_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quarantine_id uuid not null references public.recovery_notification_quarantines(id) on delete restrict,
  event_id uuid not null references public.recovery_notification_events(id) on delete restrict,
  resolution_request_id uuid not null references public.recovery_notification_resolution_requests(id) on delete restrict,
  canonical_version integer not null default 1 check (canonical_version = 1),
  evidence_fingerprint text not null check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint recovery_notification_quarantine_checkpoints_quarantine_unique unique (quarantine_id),
  constraint recovery_notification_quarantine_checkpoints_event_unique unique (event_id),
  constraint recovery_notification_quarantine_checkpoints_request_unique unique (resolution_request_id)
);

alter table public.recovery_notification_quarantine_checkpoints enable row level security;

create policy "Users can view their own notification quarantine checkpoints"
on public.recovery_notification_quarantine_checkpoints for select to authenticated
using (auth.uid() = user_id);

create or replace function public.notification_quarantine_evidence_fingerprint(
  requested_quarantine_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  fingerprint text;
begin
  select encode(extensions.digest(convert_to(concat_ws(E'\n',
    'notification-quarantine-checkpoint-v1',
    quarantine.id::text,
    quarantine.user_id::text,
    quarantine.account_settings_id::text,
    quarantine.event_id::text,
    quarantine.reservation_attempt_id::text,
    quarantine.resolution_request_id::text,
    quarantine.applied_by::text,
    quarantine.decision_scope,
    quarantine.evidence_summary,
    to_char(quarantine.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    request.requester_id::text,
    coalesce(request.reviewer_id::text, ''),
    request.status,
    request.decision_scope,
    request.evidence_summary,
    coalesce(to_char(request.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), ''),
    coalesce((
      select string_agg(concat_ws(E'\t',
        audit.id::text,
        audit.actor_id::text,
        audit.action,
        audit.decision_scope,
        audit.evidence_summary,
        to_char(audit.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      ), E'\n' order by audit.created_at, audit.id)
      from public.recovery_notification_resolution_request_audit audit
      where audit.request_id = request.id
    ), '')
  ), 'UTF8'), 'sha256'), 'hex') into fingerprint
  from public.recovery_notification_quarantines quarantine
  join public.recovery_notification_resolution_requests request
    on request.id = quarantine.resolution_request_id
  where quarantine.id = requested_quarantine_id;

  if fingerprint is null then
    raise exception 'Quarantine evidence is incomplete and cannot be checkpointed';
  end if;

  return fingerprint;
end;
$$;

create or replace function public.create_notification_quarantine_checkpoint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.recovery_notification_resolution_requests%rowtype;
  requested_count integer;
  approved_count integer;
  quarantined_count integer;
begin
  select * into request_row
  from public.recovery_notification_resolution_requests
  where id = new.resolution_request_id;

  if not found or request_row.status <> 'quarantined' then
    raise exception 'A finalized quarantine review is required before checkpointing';
  end if;

  if request_row.requester_id = request_row.reviewer_id then
    raise exception 'Independent requester and reviewer evidence is required before checkpointing';
  end if;

  if request_row.decision_scope is distinct from new.decision_scope then
    raise exception 'The quarantine decision scope does not match its reviewed request';
  end if;

  select
    count(*) filter (where action = 'requested'),
    count(*) filter (where action = 'approved'),
    count(*) filter (where action = 'quarantined')
  into requested_count, approved_count, quarantined_count
  from public.recovery_notification_resolution_request_audit
  where request_id = request_row.id;

  if requested_count <> 1 or approved_count <> 1 or quarantined_count <> 1 then
    raise exception 'Exactly one request, approval, and quarantine audit entry is required before checkpointing';
  end if;

  insert into public.recovery_notification_quarantine_checkpoints (
    user_id, quarantine_id, event_id, resolution_request_id, evidence_fingerprint
  ) values (
    new.user_id, new.id, new.event_id, new.resolution_request_id,
    public.notification_quarantine_evidence_fingerprint(new.id)
  ) on conflict (quarantine_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_notification_quarantine_checkpoint on public.recovery_notification_quarantines;
create constraint trigger create_notification_quarantine_checkpoint
after insert on public.recovery_notification_quarantines
deferrable initially deferred
for each row execute function public.create_notification_quarantine_checkpoint();

create or replace function public.protect_notification_quarantine_checkpoint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Notification quarantine evidence checkpoints are immutable';
end;
$$;

drop trigger if exists protect_notification_quarantine_checkpoint on public.recovery_notification_quarantine_checkpoints;
create trigger protect_notification_quarantine_checkpoint
before update or delete on public.recovery_notification_quarantine_checkpoints
for each row execute function public.protect_notification_quarantine_checkpoint();

insert into public.recovery_notification_quarantine_checkpoints (
  user_id, quarantine_id, event_id, resolution_request_id, evidence_fingerprint
)
select
  quarantine.user_id,
  quarantine.id,
  quarantine.event_id,
  quarantine.resolution_request_id,
  public.notification_quarantine_evidence_fingerprint(quarantine.id)
from public.recovery_notification_quarantines quarantine
on conflict (quarantine_id) do nothing;

revoke all on table public.recovery_notification_quarantine_checkpoints from anon;
revoke insert, update, delete on table public.recovery_notification_quarantine_checkpoints from authenticated;
grant select on table public.recovery_notification_quarantine_checkpoints to authenticated;
grant select, insert on table public.recovery_notification_quarantine_checkpoints to service_role;

revoke all on function public.notification_quarantine_evidence_fingerprint(uuid)
from public, anon, authenticated;
grant execute on function public.notification_quarantine_evidence_fingerprint(uuid)
to service_role;

commit;
