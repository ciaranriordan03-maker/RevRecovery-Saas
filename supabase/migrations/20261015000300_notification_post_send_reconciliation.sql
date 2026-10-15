begin;

alter table public.recovery_notification_events
  add column if not exists provider_accepted_at timestamptz;

alter table public.recovery_notification_events
  drop constraint if exists recovery_notification_events_status_check;

alter table public.recovery_notification_events
  add constraint recovery_notification_events_status_check check (
    status in ('recorded', 'suppressed', 'queued', 'accepted', 'sent', 'failed')
  );

alter table public.recovery_notification_events
  add constraint recovery_notification_events_provider_acceptance_check check (
    status <> 'accepted' or (
      provider_message_id is not null and
      provider_accepted_at is not null and
      claim_token is null and
      claimed_at is null and
      sent_at is null
    )
  );

alter table public.recovery_notification_delivery_attempts
  drop constraint if exists recovery_notification_delivery_attempts_outcome_check;

alter table public.recovery_notification_delivery_attempts
  add constraint recovery_notification_delivery_attempts_outcome_check check (
    outcome in ('blocked', 'claimed', 'accepted', 'sent', 'failed')
  );

create or replace function public.record_notification_test_provider_acceptance(
  requested_event_id uuid,
  requested_claim_token uuid,
  requested_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.recovery_notification_events%rowtype;
  accepted_at timestamptz := timezone('utc'::text, now());
begin
  if nullif(btrim(requested_provider_message_id), '') is null then
    raise exception 'A provider message identifier is required';
  end if;

  select * into event_row
  from public.recovery_notification_events
  where id = requested_event_id
  for update;

  if not found then
    raise exception 'Notification test event not found';
  end if;

  if event_row.status in ('accepted', 'sent') and
     event_row.provider_message_id = requested_provider_message_id then
    return;
  end if;

  if event_row.status <> 'queued' or
     event_row.claim_token is distinct from requested_claim_token or
     event_row.claimed_at is null or
     event_row.sent_at is not null or
     event_row.provider_message_id is not null then
    raise exception 'Notification test event is not in the exact claimed state';
  end if;

  update public.recovery_notification_events set
    status = 'accepted',
    provider_message_id = requested_provider_message_id,
    provider_accepted_at = accepted_at,
    claim_token = null,
    claimed_at = null,
    last_error = null
  where id = event_row.id;

  insert into public.recovery_notification_delivery_attempts (
    event_id, user_id, outcome, reason_code, recipient_email, provider_message_id
  ) values (
    event_row.id, event_row.user_id, 'accepted',
    'provider_accepted_pending_finalization', event_row.recipient_email,
    requested_provider_message_id
  );
end;
$$;

create or replace function public.finalize_accepted_notification_test_delivery(
  requested_event_id uuid,
  requested_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.recovery_notification_events%rowtype;
begin
  select * into event_row
  from public.recovery_notification_events
  where id = requested_event_id
  for update;

  if not found then
    raise exception 'Notification test event not found';
  end if;

  if event_row.status = 'sent' and
     event_row.provider_message_id = requested_provider_message_id then
    return;
  end if;

  if event_row.status <> 'accepted' or
     event_row.provider_message_id is distinct from requested_provider_message_id or
     event_row.provider_accepted_at is null or
     event_row.claim_token is not null or
     event_row.claimed_at is not null then
    raise exception 'Notification test event has no matching provider acceptance';
  end if;

  update public.recovery_notification_events set
    status = 'sent',
    sent_at = timezone('utc'::text, now()),
    last_error = null
  where id = event_row.id;

  insert into public.recovery_notification_delivery_attempts (
    event_id, user_id, outcome, reason_code, recipient_email, provider_message_id
  ) values (
    event_row.id, event_row.user_id, 'sent',
    'authorized_test_notification_sent', event_row.recipient_email,
    requested_provider_message_id
  );
end;
$$;

revoke all on function public.record_notification_test_provider_acceptance(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.record_notification_test_provider_acceptance(uuid, uuid, text)
to service_role;

revoke all on function public.finalize_accepted_notification_test_delivery(uuid, text)
from public, anon, authenticated;
grant execute on function public.finalize_accepted_notification_test_delivery(uuid, text)
to service_role;

commit;
