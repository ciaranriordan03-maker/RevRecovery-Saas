begin;

create table if not exists public.recovery_notification_resolution_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  event_id uuid not null references public.recovery_notification_events(id) on delete cascade,
  reservation_attempt_id uuid not null references public.recovery_notification_delivery_attempts(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete restrict,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'expired')
  ),
  decision_scope text not null default 'quarantine_only' check (
    decision_scope = 'quarantine_only'
  ),
  evidence_summary text not null check (length(btrim(evidence_summary)) between 1 and 2000),
  review_note text check (review_note is null or length(btrim(review_note)) between 1 and 2000),
  requested_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz not null,
  reviewed_at timestamptz,
  delivery_enabled_snapshot boolean not null default false check (delivery_enabled_snapshot = false),
  delivery_mode_snapshot text not null default 'disabled' check (delivery_mode_snapshot = 'disabled'),
  global_delivery_enabled_snapshot boolean not null default false check (global_delivery_enabled_snapshot = false),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (expires_at > requested_at and expires_at <= requested_at + interval '15 minutes'),
  check (reviewer_id is null or reviewer_id <> requester_id),
  check (
    (status = 'pending' and reviewer_id is null and reviewed_at is null and review_note is null) or
    (status in ('approved', 'rejected') and reviewer_id is not null and reviewed_at is not null and review_note is not null) or
    (status = 'expired' and reviewed_at is null)
  )
);

create unique index if not exists recovery_notification_resolution_requests_one_active_event_idx
on public.recovery_notification_resolution_requests (event_id)
where status = 'pending';

create index if not exists recovery_notification_resolution_requests_user_created_idx
on public.recovery_notification_resolution_requests (user_id, created_at desc);

alter table public.recovery_notification_resolution_requests enable row level security;

create policy "Users can view their own notification resolution requests"
on public.recovery_notification_resolution_requests for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.recovery_notification_resolution_request_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.recovery_notification_resolution_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('requested', 'approved', 'rejected', 'expired')),
  decision_scope text not null check (decision_scope = 'quarantine_only'),
  evidence_summary text not null check (length(btrim(evidence_summary)) between 1 and 2000),
  delivery_enabled_snapshot boolean not null default false check (delivery_enabled_snapshot = false),
  delivery_mode_snapshot text not null default 'disabled' check (delivery_mode_snapshot = 'disabled'),
  global_delivery_enabled_snapshot boolean not null default false check (global_delivery_enabled_snapshot = false),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists recovery_notification_resolution_request_audit_request_created_idx
on public.recovery_notification_resolution_request_audit (request_id, created_at asc);

alter table public.recovery_notification_resolution_request_audit enable row level security;

create policy "Users can view their own notification resolution request audit"
on public.recovery_notification_resolution_request_audit for select to authenticated
using (auth.uid() = user_id);

create or replace function public.request_notification_resolution_review(
  requested_user_id uuid,
  requested_event_id uuid,
  requested_reservation_attempt_id uuid,
  requested_requester_id uuid,
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
  account_settings public.recovery_account_settings%rowtype;
  event_row public.recovery_notification_events%rowtype;
  request_id uuid;
  normalized_evidence text := nullif(btrim(requested_evidence_summary), '');
begin
  if normalized_evidence is null or length(normalized_evidence) > 2000 then
    raise exception 'Resolution evidence must contain between 1 and 2000 characters';
  end if;

  if not exists (select 1 from auth.users where id = requested_requester_id) then
    raise exception 'Resolution requester not found';
  end if;

  select * into event_row
  from public.recovery_notification_events
  where id = requested_event_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification event not found';
  end if;

  select * into account_settings
  from public.recovery_account_settings
  where id = event_row.account_settings_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Recovery account settings not found';
  end if;

  if requested_global_delivery_enabled or
     account_settings.essential_notifications_enabled or
     account_settings.essential_notifications_delivery_mode <> 'disabled' then
    raise exception 'Notification delivery gates must remain disabled';
  end if;

  if event_row.status <> 'queued' or event_row.claim_token is null or event_row.claimed_at is null then
    raise exception 'Only a reserved notification event can enter resolution review';
  end if;

  if event_row.claimed_at > now_at - interval '15 minutes' then
    raise exception 'The notification reservation is not stale';
  end if;

  if event_row.provider_message_id is not null or event_row.provider_accepted_at is not null or event_row.sent_at is not null then
    raise exception 'Provider or delivery evidence prevents quarantine-only review';
  end if;

  if not exists (
    select 1
    from public.recovery_notification_delivery_attempts attempt
    where attempt.id = requested_reservation_attempt_id
      and attempt.event_id = event_row.id
      and attempt.user_id = requested_user_id
      and attempt.outcome = 'claimed'
      and attempt.provider_message_id is null
  ) then
    raise exception 'Matching reservation evidence is required';
  end if;

  update public.recovery_notification_resolution_requests
  set status = 'expired', updated_at = now_at
  where event_id = event_row.id and status = 'pending' and expires_at <= now_at;

  insert into public.recovery_notification_resolution_request_audit (
    request_id, user_id, actor_id, action, decision_scope, evidence_summary
  )
  select id, user_id, requester_id, 'expired', decision_scope, evidence_summary
  from public.recovery_notification_resolution_requests
  where event_id = event_row.id and status = 'expired' and updated_at = now_at
  on conflict do nothing;

  if exists (
    select 1 from public.recovery_notification_resolution_requests
    where event_id = event_row.id and status = 'pending'
  ) then
    raise exception 'An active resolution request already exists for this event';
  end if;

  insert into public.recovery_notification_resolution_requests (
    user_id, account_settings_id, event_id, reservation_attempt_id,
    requester_id, evidence_summary, expires_at
  ) values (
    requested_user_id, account_settings.id, event_row.id, requested_reservation_attempt_id,
    requested_requester_id, normalized_evidence, now_at + interval '15 minutes'
  ) returning id into request_id;

  insert into public.recovery_notification_resolution_request_audit (
    request_id, user_id, actor_id, action, decision_scope, evidence_summary
  ) values (
    request_id, requested_user_id, requested_requester_id, 'requested',
    'quarantine_only', normalized_evidence
  );

  return request_id;
end;
$$;

create or replace function public.review_notification_resolution_request(
  requested_user_id uuid,
  requested_request_id uuid,
  requested_reviewer_id uuid,
  requested_decision text,
  requested_review_note text,
  requested_global_delivery_enabled boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := timezone('utc'::text, now());
  request_row public.recovery_notification_resolution_requests%rowtype;
  account_settings public.recovery_account_settings%rowtype;
  normalized_note text := nullif(btrim(requested_review_note), '');
begin
  if requested_decision not in ('approve', 'reject') then
    raise exception 'Resolution review decision must be approve or reject';
  end if;

  if normalized_note is null or length(normalized_note) > 2000 then
    raise exception 'Resolution review note must contain between 1 and 2000 characters';
  end if;

  if not exists (select 1 from auth.users where id = requested_reviewer_id) then
    raise exception 'Resolution reviewer not found';
  end if;

  select * into request_row
  from public.recovery_notification_resolution_requests
  where id = requested_request_id and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification resolution request not found';
  end if;

  if request_row.requester_id = requested_reviewer_id then
    raise exception 'Resolution reviewer must be different from the requester';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only a pending resolution request can be reviewed';
  end if;

  if request_row.expires_at <= now_at then
    update public.recovery_notification_resolution_requests
    set status = 'expired', updated_at = now_at
    where id = request_row.id;

    insert into public.recovery_notification_resolution_request_audit (
      request_id, user_id, actor_id, action, decision_scope, evidence_summary
    ) values (
      request_row.id, requested_user_id, requested_reviewer_id, 'expired',
      request_row.decision_scope, request_row.evidence_summary
    );

    return;
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

  update public.recovery_notification_resolution_requests set
    status = case requested_decision when 'approve' then 'approved' else 'rejected' end,
    reviewer_id = requested_reviewer_id,
    review_note = normalized_note,
    reviewed_at = now_at,
    updated_at = now_at
  where id = request_row.id;

  insert into public.recovery_notification_resolution_request_audit (
    request_id, user_id, actor_id, action, decision_scope, evidence_summary
  ) values (
    request_row.id, requested_user_id, requested_reviewer_id,
    case requested_decision when 'approve' then 'approved' else 'rejected' end,
    request_row.decision_scope, normalized_note
  );
end;
$$;

revoke all on table public.recovery_notification_resolution_requests from anon;
revoke insert, update, delete on table public.recovery_notification_resolution_requests from authenticated;
grant select on table public.recovery_notification_resolution_requests to authenticated;
grant select, insert, update on table public.recovery_notification_resolution_requests to service_role;

revoke all on table public.recovery_notification_resolution_request_audit from anon;
revoke insert, update, delete on table public.recovery_notification_resolution_request_audit from authenticated;
grant select on table public.recovery_notification_resolution_request_audit to authenticated;
grant select, insert on table public.recovery_notification_resolution_request_audit to service_role;

revoke all on function public.request_notification_resolution_review(uuid, uuid, uuid, uuid, text, boolean)
from public, anon, authenticated;
grant execute on function public.request_notification_resolution_review(uuid, uuid, uuid, uuid, text, boolean)
to service_role;

revoke all on function public.review_notification_resolution_request(uuid, uuid, uuid, text, text, boolean)
from public, anon, authenticated;
grant execute on function public.review_notification_resolution_request(uuid, uuid, uuid, text, text, boolean)
to service_role;

commit;
