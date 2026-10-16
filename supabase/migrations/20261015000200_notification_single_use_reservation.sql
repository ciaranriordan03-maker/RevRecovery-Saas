begin;

alter table public.recovery_notification_delivery_attempts
  add column if not exists authorization_id uuid
  references public.recovery_notification_test_authorizations(id) on delete set null;

create unique index if not exists recovery_notification_delivery_attempts_authorization_unique
on public.recovery_notification_delivery_attempts (authorization_id)
where authorization_id is not null;

create or replace function public.reserve_authorized_notification_test_delivery(
  requested_user_id uuid,
  requested_authorization_id uuid,
  requested_event_id uuid,
  requested_global_delivery_enabled boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := timezone('utc'::text, now());
  authorization_row public.recovery_notification_test_authorizations%rowtype;
  event_row public.recovery_notification_events%rowtype;
  account_settings public.recovery_account_settings%rowtype;
  new_claim_token uuid := gen_random_uuid();
begin
  select * into authorization_row
  from public.recovery_notification_test_authorizations
  where id = requested_authorization_id
    and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification test authorization not found';
  end if;

  if authorization_row.status <> 'approved' then
    raise exception 'Only an approved notification test authorization can be consumed';
  end if;

  if authorization_row.expires_at <= now_at then
    update public.recovery_notification_test_authorizations
    set status = 'expired', updated_at = now_at
    where id = authorization_row.id;

    insert into public.recovery_notification_test_authorization_audit (
      authorization_id, user_id, action, recipient_email,
      delivery_enabled_snapshot, delivery_mode_snapshot, global_delivery_enabled_snapshot
    ) values (
      authorization_row.id, requested_user_id, 'expired', authorization_row.recipient_email,
      authorization_row.delivery_enabled_snapshot,
      authorization_row.delivery_mode_snapshot,
      authorization_row.global_delivery_enabled_snapshot
    );

    raise exception 'Notification test authorization has expired';
  end if;

  select * into event_row
  from public.recovery_notification_events
  where id = requested_event_id
    and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification test event not found';
  end if;

  select * into account_settings
  from public.recovery_account_settings
  where id = authorization_row.account_settings_id
    and id = event_row.account_settings_id
    and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Authorization and event must belong to the same account';
  end if;

  if authorization_row.recipient_email is distinct from account_settings.essential_notification_test_recipient
     or event_row.recipient_email is distinct from authorization_row.recipient_email then
    raise exception 'Authorization, event, and approved recipient must match exactly';
  end if;

  if account_settings.essential_notification_test_recipient_approved_at is null then
    raise exception 'The notification test recipient is no longer approved';
  end if;

  if not requested_global_delivery_enabled then
    raise exception 'The global notification delivery gate is disabled';
  end if;

  if not account_settings.essential_notifications_enabled
     or account_settings.essential_notifications_delivery_mode <> 'test' then
    raise exception 'The account notification delivery gate is not in test mode';
  end if;

  if not event_row.delivery_enabled_snapshot then
    raise exception 'The notification event was recorded while delivery was disabled';
  end if;

  if event_row.status <> 'queued'
     or event_row.claim_token is not null
     or event_row.sent_at is not null
     or event_row.provider_message_id is not null then
    raise exception 'The notification test event is not available for a single-use reservation';
  end if;

  if not exists (
    select 1 from public.recovery_sending_domains
    where user_id = requested_user_id and status = 'verified'
  ) then
    raise exception 'A verified sending domain is required';
  end if;

  update public.recovery_notification_events
  set claim_token = new_claim_token, claimed_at = now_at
  where id = event_row.id;

  update public.recovery_notification_test_authorizations
  set status = 'consumed', consumed_at = now_at, updated_at = now_at
  where id = authorization_row.id;

  insert into public.recovery_notification_test_authorization_audit (
    authorization_id, user_id, action, recipient_email,
    delivery_enabled_snapshot, delivery_mode_snapshot, global_delivery_enabled_snapshot
  ) values (
    authorization_row.id, requested_user_id, 'consumed', authorization_row.recipient_email,
    authorization_row.delivery_enabled_snapshot,
    authorization_row.delivery_mode_snapshot,
    authorization_row.global_delivery_enabled_snapshot
  );

  insert into public.recovery_notification_delivery_attempts (
    event_id, user_id, authorization_id, outcome, reason_code, recipient_email
  ) values (
    event_row.id, requested_user_id, authorization_row.id,
    'claimed', 'single_use_authorization_consumed', authorization_row.recipient_email
  );

  return new_claim_token;
end;
$$;

revoke all on function public.reserve_authorized_notification_test_delivery(uuid, uuid, uuid, boolean)
from public, anon, authenticated;
grant execute on function public.reserve_authorized_notification_test_delivery(uuid, uuid, uuid, boolean)
to service_role;

commit;
