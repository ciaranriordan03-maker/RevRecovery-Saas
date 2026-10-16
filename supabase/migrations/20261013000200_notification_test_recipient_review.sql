begin;

alter table public.recovery_account_settings
  add column if not exists essential_notification_test_recipient_candidate text,
  add column if not exists essential_notification_test_recipient_selected_at timestamptz,
  add column if not exists essential_notification_test_recipient_approved_at timestamptz;

create table if not exists public.recovery_notification_recipient_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_settings_id uuid not null references public.recovery_account_settings(id) on delete cascade,
  action text not null check (action in ('proposed', 'approved', 'cleared')),
  proposed_recipient text,
  approved_recipient text,
  delivery_enabled_snapshot boolean not null default false,
  delivery_mode_snapshot text not null default 'disabled',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint recovery_notification_recipient_reviews_delivery_mode_check
    check (delivery_mode_snapshot in ('disabled', 'test')),
  constraint recovery_notification_recipient_reviews_no_delivery_check
    check (delivery_enabled_snapshot = false)
);

create index if not exists recovery_notification_recipient_reviews_user_created_idx
on public.recovery_notification_recipient_reviews (user_id, created_at desc);

alter table public.recovery_notification_recipient_reviews enable row level security;

create policy "Users can view their own notification recipient reviews"
on public.recovery_notification_recipient_reviews for select to authenticated
using (auth.uid() = user_id);

create or replace function public.review_notification_test_recipient(
  requested_user_id uuid,
  requested_action text,
  requested_recipient text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  account_settings public.recovery_account_settings%rowtype;
  normalized_recipient text := lower(nullif(trim(requested_recipient), ''));
begin
  if requested_action not in ('propose', 'approve', 'clear') then
    raise exception 'Invalid notification recipient review action';
  end if;

  select * into account_settings
  from public.recovery_account_settings
  where user_id = requested_user_id
  for update;

  if not found then
    raise exception 'Recovery account settings not found';
  end if;

  if requested_action in ('propose', 'approve') and
     (normalized_recipient is null or normalized_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'A valid notification test recipient is required';
  end if;

  if requested_action = 'propose' then
    update public.recovery_account_settings set
      essential_notification_test_recipient_candidate = normalized_recipient,
      essential_notification_test_recipient_selected_at = timezone('utc'::text, now()),
      essential_notification_test_recipient = null,
      essential_notification_test_recipient_approved_at = null
    where id = account_settings.id;
  elsif requested_action = 'approve' then
    if account_settings.essential_notification_test_recipient_candidate is distinct from normalized_recipient then
      raise exception 'The proposed recipient must match the recipient being approved';
    end if;
    update public.recovery_account_settings set
      essential_notification_test_recipient = normalized_recipient,
      essential_notification_test_recipient_approved_at = timezone('utc'::text, now())
    where id = account_settings.id;
  else
    update public.recovery_account_settings set
      essential_notification_test_recipient_candidate = null,
      essential_notification_test_recipient_selected_at = null,
      essential_notification_test_recipient = null,
      essential_notification_test_recipient_approved_at = null
    where id = account_settings.id;
  end if;

  insert into public.recovery_notification_recipient_reviews (
    user_id,
    account_settings_id,
    action,
    proposed_recipient,
    approved_recipient,
    delivery_enabled_snapshot,
    delivery_mode_snapshot
  ) values (
    requested_user_id,
    account_settings.id,
    case requested_action when 'propose' then 'proposed' when 'approve' then 'approved' else 'cleared' end,
    case when requested_action = 'clear' then null else normalized_recipient end,
    case when requested_action = 'approve' then normalized_recipient else null end,
    false,
    account_settings.essential_notifications_delivery_mode
  );
end;
$$;

revoke all on function public.review_notification_test_recipient(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_notification_test_recipient(uuid, text, text) to service_role;

commit;
