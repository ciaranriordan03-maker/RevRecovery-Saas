begin;

create table if not exists public.recovery_notification_test_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'consumed', 'revoked', 'expired')
  ),
  requested_at timestamptz not null default timezone('utc'::text, now()),
  approved_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  delivery_enabled_snapshot boolean not null default false check (delivery_enabled_snapshot = false),
  delivery_mode_snapshot text not null default 'disabled' check (delivery_mode_snapshot = 'disabled'),
  global_delivery_enabled_snapshot boolean not null default false check (global_delivery_enabled_snapshot = false),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (recipient_email = lower(btrim(recipient_email)) and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (expires_at > requested_at),
  check (status not in ('approved', 'consumed') or approved_at is not null),
  check (status <> 'pending' or approved_at is null),
  check ((status = 'consumed') = (consumed_at is not null))
);

create unique index if not exists recovery_notification_test_authorizations_one_active_idx
on public.recovery_notification_test_authorizations (account_settings_id)
where status in ('pending', 'approved');

create index if not exists recovery_notification_test_authorizations_user_created_idx
on public.recovery_notification_test_authorizations (user_id, created_at desc);

alter table public.recovery_notification_test_authorizations enable row level security;

create policy "Users can view their own notification test authorizations"
on public.recovery_notification_test_authorizations for select to authenticated
using (auth.uid() = user_id);

create table if not exists public.recovery_notification_test_authorization_audit (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.recovery_notification_test_authorizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('requested', 'approved', 'consumed', 'revoked', 'expired')),
  recipient_email text not null,
  delivery_enabled_snapshot boolean not null default false check (delivery_enabled_snapshot = false),
  delivery_mode_snapshot text not null default 'disabled' check (delivery_mode_snapshot = 'disabled'),
  global_delivery_enabled_snapshot boolean not null default false check (global_delivery_enabled_snapshot = false),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists recovery_notification_test_authorization_audit_user_created_idx
on public.recovery_notification_test_authorization_audit (user_id, created_at desc);

alter table public.recovery_notification_test_authorization_audit enable row level security;

create policy "Users can view their own notification test authorization audit"
on public.recovery_notification_test_authorization_audit for select to authenticated
using (auth.uid() = user_id);

create or replace function public.review_notification_test_authorization(
  requested_user_id uuid,
  requested_action text,
  requested_authorization_id uuid default null,
  requested_global_delivery_enabled boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_settings public.recovery_account_settings%rowtype;
  authorization_row public.recovery_notification_test_authorizations%rowtype;
  now_at timestamptz := now();
begin
  if requested_action not in ('request', 'approve', 'revoke') then
    raise exception 'Invalid notification test authorization action';
  end if;

  select * into account_settings
  from public.recovery_account_settings
  where user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Recovery account settings not found';
  end if;

  update public.recovery_notification_test_authorizations
  set status = 'expired', updated_at = now_at
  where account_settings_id = account_settings.id
    and status in ('pending', 'approved')
    and expires_at <= now_at;

  insert into public.recovery_notification_test_authorization_audit (
    authorization_id, user_id, action, recipient_email
  )
  select id, user_id, 'expired', recipient_email
  from public.recovery_notification_test_authorizations
  where account_settings_id = account_settings.id
    and status = 'expired'
    and updated_at = now_at
  on conflict do nothing;

  if requested_action in ('request', 'approve') then
    if requested_global_delivery_enabled then
      raise exception 'The global notification delivery gate must remain disabled';
    end if;

    if account_settings.essential_notifications_enabled or
       account_settings.essential_notifications_delivery_mode <> 'disabled' then
      raise exception 'Notification delivery gates must remain disabled';
    end if;

    if account_settings.essential_notification_test_recipient is null or
       account_settings.essential_notification_test_recipient_approved_at is null then
      raise exception 'An approved notification test recipient is required';
    end if;

    if not exists (
      select 1 from public.recovery_sending_domains
      where user_id = requested_user_id and status = 'verified'
    ) then
      raise exception 'A verified sending domain is required';
    end if;

    if not exists (
      select 1
      from public.recovery_notification_delivery_attempts attempts
      join public.recovery_notification_events events on events.id = attempts.event_id
      where attempts.user_id = requested_user_id
        and attempts.outcome = 'blocked'
        and attempts.reason_code = 'global_disabled'
        and attempts.provider_message_id is null
        and events.sent_at is null
        and events.provider_message_id is null
        and events.payload @> '{"drill":"D4i"}'::jsonb
    ) then
      raise exception 'Blocked-delivery evidence is required';
    end if;
  end if;

  if requested_action = 'request' then
    if exists (
      select 1 from public.recovery_notification_test_authorizations
      where account_settings_id = account_settings.id and status in ('pending', 'approved')
    ) then
      raise exception 'An active notification test authorization already exists';
    end if;

    insert into public.recovery_notification_test_authorizations (
      user_id,
      account_settings_id,
      recipient_email,
      status,
      expires_at
    ) values (
      requested_user_id,
      account_settings.id,
      account_settings.essential_notification_test_recipient,
      'pending',
      now_at + interval '60 minutes'
    ) returning * into authorization_row;

    insert into public.recovery_notification_test_authorization_audit (
      authorization_id, user_id, action, recipient_email
    ) values (
      authorization_row.id, requested_user_id, 'requested', authorization_row.recipient_email
    );

    return authorization_row.id;
  end if;

  select * into authorization_row
  from public.recovery_notification_test_authorizations
  where id = requested_authorization_id
    and user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Notification test authorization not found';
  end if;

  if requested_action = 'approve' then
    if authorization_row.status <> 'pending' or authorization_row.expires_at <= now_at then
      raise exception 'Only an active pending authorization can be approved';
    end if;
    if authorization_row.recipient_email is distinct from account_settings.essential_notification_test_recipient then
      raise exception 'The approved recipient changed after authorization was requested';
    end if;

    update public.recovery_notification_test_authorizations set
      status = 'approved',
      approved_at = now_at,
      expires_at = now_at + interval '15 minutes',
      updated_at = now_at
    where id = authorization_row.id
    returning * into authorization_row;

    insert into public.recovery_notification_test_authorization_audit (
      authorization_id, user_id, action, recipient_email
    ) values (
      authorization_row.id, requested_user_id, 'approved', authorization_row.recipient_email
    );

    return authorization_row.id;
  end if;

  if authorization_row.status not in ('pending', 'approved') then
    raise exception 'Only an active authorization can be revoked';
  end if;

  update public.recovery_notification_test_authorizations set
    status = 'revoked',
    approved_at = null,
    updated_at = now_at
  where id = authorization_row.id
  returning * into authorization_row;

  insert into public.recovery_notification_test_authorization_audit (
    authorization_id, user_id, action, recipient_email
  ) values (
    authorization_row.id, requested_user_id, 'revoked', authorization_row.recipient_email
  );

  return authorization_row.id;
end;
$$;

revoke all on table public.recovery_notification_test_authorizations from anon;
revoke insert, update, delete on table public.recovery_notification_test_authorizations from authenticated;
grant select on table public.recovery_notification_test_authorizations to authenticated;
grant select, insert, update, delete on table public.recovery_notification_test_authorizations to service_role;

revoke all on table public.recovery_notification_test_authorization_audit from anon;
revoke insert, update, delete on table public.recovery_notification_test_authorization_audit from authenticated;
grant select on table public.recovery_notification_test_authorization_audit to authenticated;
grant select, insert on table public.recovery_notification_test_authorization_audit to service_role;

revoke all on function public.review_notification_test_authorization(uuid, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.review_notification_test_authorization(uuid, text, uuid, boolean) to service_role;

commit;
