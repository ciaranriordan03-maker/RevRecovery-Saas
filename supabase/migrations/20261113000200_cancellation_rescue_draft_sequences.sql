-- Phase 2 cancellation rescue: deterministic draft projections only.
-- There are intentionally no recipient addresses, provider IDs, delivery attempts,
-- rescue tokens, customer routes, or Stripe mutation capabilities in this schema.

create table if not exists public.cancellation_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean not null,
  status text not null check (status in ('draft', 'ineligible', 'canceled')),
  recipient_readiness text not null default 'unresolved' check (
    recipient_readiness in ('unresolved')
  ),
  ineligible_reason text check (
    ineligible_reason is null or ineligible_reason in (
      'invalid_anchor', 'insufficient_window', 'missing_scheduled_end',
      'mode_not_supported_phase_2'
    )
  ),
  scheduled_end_at timestamptz,
  configuration_snapshot jsonb not null,
  projected_at timestamptz not null,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (cancellation_case_id)
);

create table if not exists public.cancellation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_case_id uuid not null references public.cancellation_cases(id) on delete cascade,
  sequence_id uuid not null references public.cancellation_sequences(id) on delete cascade,
  message_key text not null,
  step_number integer not null check (step_number between 1 and 3),
  medium text not null default 'email_draft' check (medium = 'email_draft'),
  status text not null default 'draft' check (status in ('draft', 'canceled')),
  subject text not null,
  body_preview text not null,
  scheduled_for timestamptz not null,
  configuration_snapshot jsonb not null,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (sequence_id, message_key),
  unique (sequence_id, step_number)
);

create index if not exists cancellation_sequences_user_status_idx
  on public.cancellation_sequences (user_id, status, projected_at desc);
create index if not exists cancellation_messages_sequence_schedule_idx
  on public.cancellation_messages (sequence_id, status, scheduled_for);

alter table public.cancellation_sequences enable row level security;
alter table public.cancellation_messages enable row level security;

drop policy if exists "Users can view their cancellation sequences" on public.cancellation_sequences;
create policy "Users can view their cancellation sequences"
on public.cancellation_sequences for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their cancellation message drafts" on public.cancellation_messages;
create policy "Users can view their cancellation message drafts"
on public.cancellation_messages for select to authenticated
using (auth.uid() = user_id);

create or replace function public.project_cancellation_sequence(
  requested_case_id uuid,
  requested_configuration_snapshot jsonb,
  requested_ineligible_reason text,
  requested_messages jsonb,
  requested_projected_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_case public.cancellation_cases%rowtype;
  target_mode text;
  target_sequence_id uuid;
  scheduled_end timestamptz;
  sequence_status text;
  normalized_reason text;
  message_record jsonb;
  message_schedule timestamptz;
  seen_keys text[] := array[]::text[];
begin
  if requested_configuration_snapshot is null
    or jsonb_typeof(requested_configuration_snapshot) <> 'object'
    or requested_messages is null
    or jsonb_typeof(requested_messages) <> 'array'
    or jsonb_array_length(requested_messages) > 3 then
    raise exception 'invalid cancellation sequence projection';
  end if;

  select cases.* into target_case
  from public.cancellation_cases as cases
  where cases.id = requested_case_id
  for update;

  if target_case.id is null then
    raise exception 'cancellation case not found';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cancellation_sequence:' || requested_case_id::text, 0)
  );

  select settings.mode into target_mode
  from public.cancellation_rescue_settings as settings
  where settings.user_id = target_case.user_id
    and settings.stripe_account_id = target_case.stripe_account_id
    and settings.livemode = target_case.livemode;

  scheduled_end := coalesce(target_case.cancel_at, target_case.current_period_end);

  if target_case.status <> 'shadow' then
    sequence_status := 'canceled';
    normalized_reason := null;
  elsif coalesce(target_mode, 'shadow') not in ('shadow', 'test') then
    sequence_status := 'ineligible';
    normalized_reason := 'mode_not_supported_phase_2';
  elsif requested_ineligible_reason is not null then
    if requested_ineligible_reason not in (
      'invalid_anchor', 'insufficient_window', 'missing_scheduled_end'
    ) then
      raise exception 'unsupported cancellation sequence ineligibility reason';
    end if;
    sequence_status := 'ineligible';
    normalized_reason := requested_ineligible_reason;
  else
    sequence_status := 'draft';
    normalized_reason := null;
  end if;

  if sequence_status = 'draft' and jsonb_array_length(requested_messages) = 0 then
    raise exception 'draft sequence requires at least one message';
  end if;

  insert into public.cancellation_sequences (
    user_id, cancellation_case_id, stripe_account_id, livemode, status,
    ineligible_reason, scheduled_end_at, configuration_snapshot,
    projected_at, canceled_at
  ) values (
    target_case.user_id, target_case.id, target_case.stripe_account_id,
    target_case.livemode, sequence_status, normalized_reason, scheduled_end,
    requested_configuration_snapshot, requested_projected_at,
    case when sequence_status = 'canceled' then requested_projected_at else null end
  ) on conflict (cancellation_case_id) do update set
    status = excluded.status,
    ineligible_reason = excluded.ineligible_reason,
    scheduled_end_at = excluded.scheduled_end_at,
    configuration_snapshot = excluded.configuration_snapshot,
    projected_at = excluded.projected_at,
    canceled_at = excluded.canceled_at,
    updated_at = timezone('utc'::text, now())
  returning id into target_sequence_id;

  if sequence_status <> 'draft' then
    update public.cancellation_messages
    set status = 'canceled',
        canceled_at = coalesce(canceled_at, requested_projected_at),
        updated_at = timezone('utc'::text, now())
    where sequence_id = target_sequence_id and status = 'draft';
    return target_sequence_id;
  end if;

  for message_record in select value from jsonb_array_elements(requested_messages)
  loop
    if jsonb_typeof(message_record) <> 'object'
      or nullif(trim(message_record->>'message_key'), '') is null
      or nullif(trim(message_record->>'subject'), '') is null
      or nullif(trim(message_record->>'body_preview'), '') is null
      or (message_record->>'step_number')::integer not between 1 and 3 then
      raise exception 'invalid cancellation message draft';
    end if;

    message_schedule := (message_record->>'scheduled_for')::timestamptz;

    if scheduled_end is null
      or message_schedule <= requested_projected_at
      or message_schedule >= scheduled_end then
      raise exception 'cancellation message schedule is outside the safe window';
    end if;

    if (message_record->>'message_key') = any(seen_keys) then
      raise exception 'duplicate cancellation message key';
    end if;
    seen_keys := array_append(seen_keys, message_record->>'message_key');

    insert into public.cancellation_messages (
      user_id, cancellation_case_id, sequence_id, message_key, step_number,
      subject, body_preview, scheduled_for, configuration_snapshot
    ) values (
      target_case.user_id, target_case.id, target_sequence_id,
      message_record->>'message_key', (message_record->>'step_number')::integer,
      message_record->>'subject', message_record->>'body_preview',
      message_schedule, requested_configuration_snapshot
    ) on conflict (sequence_id, message_key) do update set
      step_number = excluded.step_number,
      status = 'draft',
      subject = excluded.subject,
      body_preview = excluded.body_preview,
      scheduled_for = excluded.scheduled_for,
      configuration_snapshot = excluded.configuration_snapshot,
      canceled_at = null,
      updated_at = timezone('utc'::text, now());
  end loop;

  update public.cancellation_messages
  set status = 'canceled',
      canceled_at = coalesce(canceled_at, requested_projected_at),
      updated_at = timezone('utc'::text, now())
  where sequence_id = target_sequence_id
    and status = 'draft'
    and not (message_key = any(seen_keys));

  return target_sequence_id;
end;
$$;

revoke all on function public.project_cancellation_sequence(
  uuid, jsonb, text, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.project_cancellation_sequence(
  uuid, jsonb, text, jsonb, timestamptz
) to service_role;

revoke insert, update, delete on table public.cancellation_sequences
  from public, anon, authenticated;
revoke insert, update, delete on table public.cancellation_messages
  from public, anon, authenticated;
grant select, insert, update on table public.cancellation_sequences to service_role;
grant select, insert, update on table public.cancellation_messages to service_role;
