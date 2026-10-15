begin;

alter table public.recovery_notification_resolution_requests
  drop constraint if exists recovery_notification_resolution_requests_status_check;

alter table public.recovery_notification_resolution_requests
  add constraint recovery_notification_resolution_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'expired', 'quarantined')
  );

alter table public.recovery_notification_resolution_requests
  drop constraint if exists recovery_notification_resolution_requests_check2;

alter table public.recovery_notification_resolution_requests
  add constraint recovery_notification_resolution_requests_check2 check (
    (status = 'pending' and reviewer_id is null and reviewed_at is null and review_note is null) or
    (status in ('approved', 'rejected', 'quarantined') and reviewer_id is not null and reviewed_at is not null and review_note is not null) or
    (status = 'expired' and reviewed_at is null)
  );

alter table public.recovery_notification_resolution_request_audit
  drop constraint if exists recovery_notification_resolution_request_audit_action_check;

alter table public.recovery_notification_resolution_request_audit
  add constraint recovery_notification_resolution_request_audit_action_check check (
    action in ('requested', 'approved', 'rejected', 'expired', 'quarantined')
  );

create table if not exists public.recovery_notification_quarantines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  event_id uuid not null references public.recovery_notification_events(id) on delete restrict,
  reservation_attempt_id uuid not null references public.recovery_notification_delivery_attempts(id) on delete restrict,
  resolution_request_id uuid not null references public.recovery_notification_resolution_requests(id) on delete restrict,
  applied_by uuid not null references auth.users(id) on delete restrict,
  decision_scope text not null default 'quarantine_only' check (decision_scope = 'quarantine_only'),
  evidence_summary text not null check (length(btrim(evidence_summary)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint recovery_notification_quarantines_event_unique unique (event_id),
  constraint recovery_notification_quarantines_request_unique unique (resolution_request_id)
);

alter table public.recovery_notification_quarantines enable row level security;

create policy "Users can view their own notification quarantines"
on public.recovery_notification_quarantines for select to authenticated
using (auth.uid() = user_id);

create or replace function public.protect_quarantined_notification_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.recovery_notification_quarantines
    where event_id = old.id
  ) then
    raise exception 'A quarantined notification event is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_quarantined_notification_event on public.recovery_notification_events;
create trigger protect_quarantined_notification_event
before update on public.recovery_notification_events
for each row execute function public.protect_quarantined_notification_event();

create or replace function public.protect_quarantined_notification_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.recovery_notification_quarantines
    where event_id = new.event_id
  ) then
    raise exception 'A quarantined notification event cannot record another delivery attempt';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_quarantined_notification_attempt on public.recovery_notification_delivery_attempts;
create trigger protect_quarantined_notification_attempt
before insert or update on public.recovery_notification_delivery_attempts
for each row execute function public.protect_quarantined_notification_attempt();

create or replace function public.apply_notification_resolution_quarantine(
  requested_user_id uuid,
  requested_request_id uuid,
  requested_actor_id uuid,
  requested_evidence_summary text,
  requested_global_delivery_enabled boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := timezone('utc'::text, now());
  request_row public.recovery_notification_resolution_requests%rowtype;
  account_settings public.recovery_account_settings%rowtype;
  event_row public.recovery_notification_events%rowtype;
  quarantine_id uuid;
  normalized_evidence text := nullif(btrim(requested_evidence_summary), '');
begin
  if normalized_evidence is null or length(normalized_evidence) > 2000 then
    raise exception 'Quarantine evidence must contain between 1 and 2000 characters';
  end if;

  select * into request_row
  from public.recovery_notification_resolution_requests
  where id = requested_request_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification resolution request not found';
  end if;

  if request_row.status = 'quarantined' then
    select id into quarantine_id
    from public.recovery_notification_quarantines
    where resolution_request_id = request_row.id;
    return quarantine_id;
  end if;

  if request_row.status <> 'approved' then
    raise exception 'Only an approved resolution request can be quarantined';
  end if;

  if request_row.expires_at <= now_at then
    raise exception 'The approved resolution request has expired';
  end if;

  if request_row.reviewer_id is distinct from requested_actor_id then
    raise exception 'Only the independent reviewer can apply the approved quarantine';
  end if;

  select * into account_settings
  from public.recovery_account_settings
  where id = request_row.account_settings_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Recovery account settings not found';
  end if;

  if requested_global_delivery_enabled or
     account_settings.essential_notifications_enabled or
     account_settings.essential_notifications_delivery_mode <> 'disabled' then
    raise exception 'Notification delivery gates must remain disabled';
  end if;

  select * into event_row
  from public.recovery_notification_events
  where id = request_row.event_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification event not found';
  end if;

  if event_row.status <> 'queued' or event_row.claim_token is null or event_row.claimed_at is null then
    raise exception 'The notification reservation is no longer eligible for quarantine';
  end if;

  if event_row.claimed_at > now_at - interval '15 minutes' then
    raise exception 'The notification reservation is not stale';
  end if;

  if event_row.provider_message_id is not null or event_row.provider_accepted_at is not null or event_row.sent_at is not null then
    raise exception 'Provider or delivery evidence prevents quarantine';
  end if;

  if not exists (
    select 1 from public.recovery_notification_delivery_attempts attempt
    where attempt.id = request_row.reservation_attempt_id
      and attempt.event_id = event_row.id
      and attempt.user_id = requested_user_id
      and attempt.outcome = 'claimed'
      and attempt.provider_message_id is null
  ) then
    raise exception 'Matching reservation evidence is required';
  end if;

  insert into public.recovery_notification_quarantines (
    user_id, account_settings_id, event_id, reservation_attempt_id,
    resolution_request_id, applied_by, evidence_summary
  ) values (
    requested_user_id, request_row.account_settings_id, request_row.event_id,
    request_row.reservation_attempt_id, request_row.id, requested_actor_id,
    normalized_evidence
  ) returning id into quarantine_id;

  update public.recovery_notification_resolution_requests
  set status = 'quarantined', updated_at = now_at
  where id = request_row.id;

  insert into public.recovery_notification_resolution_request_audit (
    request_id, user_id, actor_id, action, decision_scope, evidence_summary
  ) values (
    request_row.id, requested_user_id, requested_actor_id, 'quarantined',
    request_row.decision_scope, normalized_evidence
  );

  return quarantine_id;
end;
$$;

revoke all on table public.recovery_notification_quarantines from anon;
revoke insert, update, delete on table public.recovery_notification_quarantines from authenticated;
grant select on table public.recovery_notification_quarantines to authenticated;
grant select, insert on table public.recovery_notification_quarantines to service_role;

revoke all on function public.apply_notification_resolution_quarantine(uuid, uuid, uuid, text, boolean)
from public, anon, authenticated;
grant execute on function public.apply_notification_resolution_quarantine(uuid, uuid, uuid, text, boolean)
to service_role;

commit;
