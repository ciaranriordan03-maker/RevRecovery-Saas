begin;

-- Immutable, case-oriented facts used by the customer timeline. Existing
-- lifecycle tables remain authoritative for operational state; this table is
-- an append-only projection that makes their history safe and efficient to read.
create table if not exists public.recovery_case_events (
  id uuid primary key default gen_random_uuid(),
  failed_payment_id uuid not null references public.failed_payments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  livemode boolean,
  event_type text not null,
  source text not null check (
    source in (
      'stripe',
      'case_transition',
      'recovery_message_schedule',
      'recovery_message_status',
      'provider_message_event'
    )
  ),
  source_event_id text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (source, source_event_id)
);

create index if not exists recovery_case_events_case_timeline_idx
on public.recovery_case_events (failed_payment_id, occurred_at, recorded_at, id);

create index if not exists recovery_case_events_user_timeline_idx
on public.recovery_case_events (user_id, occurred_at desc);

create index if not exists recovery_case_events_account_mode_idx
on public.recovery_case_events (stripe_account_id, livemode, occurred_at desc);

alter table public.recovery_case_events enable row level security;

drop policy if exists "Users can view their own recovery case events"
on public.recovery_case_events;

create policy "Users can view their own recovery case events"
on public.recovery_case_events
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.recovery_case_events from anon;
revoke insert, update, delete on table public.recovery_case_events from authenticated;
grant select on table public.recovery_case_events to authenticated;
grant select, insert on table public.recovery_case_events to service_role;

create or replace function public.capture_failed_payment_stripe_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.latest_stripe_event_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.latest_stripe_event_id is not distinct from old.latest_stripe_event_id
  then
    return new;
  end if;

  insert into public.recovery_case_events (
    failed_payment_id, user_id, stripe_account_id, livemode, event_type,
    source, source_event_id, occurred_at, metadata
  ) values (
    new.id,
    new.user_id,
    new.stripe_account_id,
    new.livemode,
    coalesce(new.last_event_type, 'stripe.unknown'),
    'stripe',
    new.latest_stripe_event_id,
    coalesce(new.latest_event_created_at, new.updated_at, new.created_at),
    jsonb_strip_nulls(jsonb_build_object(
      'amount_due', new.amount_due,
      'amount_paid', new.amount_paid,
      'attempt_count', new.attempt_count,
      'case_status', new.case_status,
      'currency', new.currency,
      'decline_code', new.decline_code,
      'failure_code', new.failure_code,
      'invoice_status', new.invoice_status,
      'next_payment_attempt_at', new.next_payment_attempt_at
    ))
  )
  on conflict (source, source_event_id) do nothing;

  return new;
end;
$$;

create or replace function public.capture_recovery_case_transition_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.failed_payments%rowtype;
begin
  select * into payment
  from public.failed_payments
  where id = new.failed_payment_id;

  if payment.id is null then
    return new;
  end if;

  insert into public.recovery_case_events (
    failed_payment_id, user_id, stripe_account_id, livemode, event_type,
    source, source_event_id, occurred_at, metadata
  ) values (
    new.failed_payment_id,
    new.user_id,
    payment.stripe_account_id,
    payment.livemode,
    'case_status_changed',
    'case_transition',
    new.id::text,
    new.created_at,
    jsonb_strip_nulls(jsonb_build_object(
      'from_status', new.from_status,
      'reason', new.reason,
      'stripe_event_id', new.stripe_event_id,
      'to_status', new.to_status,
      'transition_metadata', new.metadata
    ))
  )
  on conflict (source, source_event_id) do nothing;

  return new;
end;
$$;

create or replace function public.capture_recovery_message_timeline_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.failed_payments%rowtype;
  timeline_event_type text;
  timeline_occurred_at timestamptz;
  timeline_source text;
  timeline_source_event_id text;
begin
  select * into payment
  from public.failed_payments
  where id = new.failed_payment_id;

  if payment.id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    timeline_event_type := 'recovery_message_scheduled';
    timeline_occurred_at := new.created_at;
    timeline_source := 'recovery_message_schedule';
    timeline_source_event_id := new.id::text;
  elsif new.status is distinct from old.status
    and new.status in ('sent', 'canceled', 'failed_terminal', 'paused')
  then
    timeline_event_type := 'recovery_message_' || new.status;
    timeline_occurred_at := coalesce(
      new.sent_at,
      new.canceled_at,
      new.terminal_failed_at,
      new.updated_at
    );
    timeline_source := 'recovery_message_status';
    timeline_source_event_id := concat_ws(
      ':',
      new.id::text,
      new.status,
      new.delivery_generation::text,
      new.send_attempt_count::text,
      extract(epoch from timeline_occurred_at)::text
    );
  else
    return new;
  end if;

  insert into public.recovery_case_events (
    failed_payment_id, user_id, stripe_account_id, livemode, event_type,
    source, source_event_id, occurred_at, metadata
  ) values (
    new.failed_payment_id,
    new.user_id,
    payment.stripe_account_id,
    payment.livemode,
    timeline_event_type,
    timeline_source,
    timeline_source_event_id,
    timeline_occurred_at,
    jsonb_strip_nulls(jsonb_build_object(
      'delivery_generation', new.delivery_generation,
      'message_key', new.message_key,
      'provider_message_id', new.provider_message_id,
      'scheduled_for', new.scheduled_for,
      'send_attempt_count', new.send_attempt_count,
      'status', new.status,
      'step_number', new.step_number
    ))
  )
  on conflict (source, source_event_id) do nothing;

  return new;
end;
$$;

create or replace function public.capture_provider_message_timeline_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  message public.recovery_messages%rowtype;
  payment public.failed_payments%rowtype;
begin
  if new.recovery_message_id is null then
    return new;
  end if;

  select * into message
  from public.recovery_messages
  where id = new.recovery_message_id;

  if message.id is null then
    return new;
  end if;

  select * into payment
  from public.failed_payments
  where id = message.failed_payment_id;

  if payment.id is null then
    return new;
  end if;

  insert into public.recovery_case_events (
    failed_payment_id, user_id, stripe_account_id, livemode, event_type,
    source, source_event_id, occurred_at, metadata
  ) values (
    message.failed_payment_id,
    message.user_id,
    payment.stripe_account_id,
    payment.livemode,
    'email_' || new.event_type,
    'provider_message_event',
    new.provider || ':' || new.provider_event_id,
    new.occurred_at,
    jsonb_strip_nulls(jsonb_build_object(
      'message_key', message.message_key,
      'provider', new.provider,
      'provider_event_type', new.provider_event_type,
      'provider_message_id', new.provider_message_id,
      'recovery_message_id', new.recovery_message_id,
      'step_number', message.step_number
    ))
  )
  on conflict (source, source_event_id) do nothing;

  return new;
end;
$$;

drop trigger if exists failed_payments_capture_timeline_event
on public.failed_payments;
create trigger failed_payments_capture_timeline_event
after insert or update of latest_stripe_event_id on public.failed_payments
for each row execute function public.capture_failed_payment_stripe_event();

drop trigger if exists recovery_case_transitions_capture_timeline_event
on public.recovery_case_transitions;
create trigger recovery_case_transitions_capture_timeline_event
after insert on public.recovery_case_transitions
for each row execute function public.capture_recovery_case_transition_event();

drop trigger if exists recovery_messages_capture_timeline_event
on public.recovery_messages;
create trigger recovery_messages_capture_timeline_event
after insert or update of status on public.recovery_messages
for each row execute function public.capture_recovery_message_timeline_event();

drop trigger if exists recovery_message_events_capture_timeline_event
on public.recovery_message_events;
create trigger recovery_message_events_capture_timeline_event
after insert on public.recovery_message_events
for each row execute function public.capture_provider_message_timeline_event();

-- Backfill only facts that the existing schema can establish reliably. Legacy
-- cases can remain incomplete; no event or explanation is invented.
insert into public.recovery_case_events (
  failed_payment_id, user_id, stripe_account_id, livemode, event_type,
  source, source_event_id, occurred_at, metadata
)
select
  payment.id,
  payment.user_id,
  payment.stripe_account_id,
  payment.livemode,
  coalesce(payment.last_event_type, 'stripe.unknown'),
  'stripe',
  payment.latest_stripe_event_id,
  coalesce(payment.latest_event_created_at, payment.updated_at, payment.created_at),
  jsonb_strip_nulls(jsonb_build_object(
    'amount_due', payment.amount_due,
    'amount_paid', payment.amount_paid,
    'attempt_count', payment.attempt_count,
    'case_status', payment.case_status,
    'currency', payment.currency,
    'decline_code', payment.decline_code,
    'failure_code', payment.failure_code,
    'invoice_status', payment.invoice_status,
    'next_payment_attempt_at', payment.next_payment_attempt_at
  ))
from public.failed_payments as payment
where payment.latest_stripe_event_id is not null
on conflict (source, source_event_id) do nothing;

insert into public.recovery_case_events (
  failed_payment_id, user_id, stripe_account_id, livemode, event_type,
  source, source_event_id, occurred_at, metadata
)
select
  transition.failed_payment_id,
  transition.user_id,
  payment.stripe_account_id,
  payment.livemode,
  'case_status_changed',
  'case_transition',
  transition.id::text,
  transition.created_at,
  jsonb_strip_nulls(jsonb_build_object(
    'from_status', transition.from_status,
    'reason', transition.reason,
    'stripe_event_id', transition.stripe_event_id,
    'to_status', transition.to_status,
    'transition_metadata', transition.metadata
  ))
from public.recovery_case_transitions as transition
join public.failed_payments as payment on payment.id = transition.failed_payment_id
on conflict (source, source_event_id) do nothing;

insert into public.recovery_case_events (
  failed_payment_id, user_id, stripe_account_id, livemode, event_type,
  source, source_event_id, occurred_at, metadata
)
select
  message.failed_payment_id,
  message.user_id,
  payment.stripe_account_id,
  payment.livemode,
  'recovery_message_scheduled',
  'recovery_message_schedule',
  message.id::text,
  message.created_at,
  jsonb_strip_nulls(jsonb_build_object(
    'message_key', message.message_key,
    'scheduled_for', message.scheduled_for,
    'status', message.status,
    'step_number', message.step_number
  ))
from public.recovery_messages as message
join public.failed_payments as payment on payment.id = message.failed_payment_id
on conflict (source, source_event_id) do nothing;

insert into public.recovery_case_events (
  failed_payment_id, user_id, stripe_account_id, livemode, event_type,
  source, source_event_id, occurred_at, metadata
)
select
  message.failed_payment_id,
  message.user_id,
  payment.stripe_account_id,
  payment.livemode,
  'recovery_message_' || message.status,
  'recovery_message_status',
  concat_ws(
    ':',
    message.id::text,
    message.status,
    message.delivery_generation::text,
    message.send_attempt_count::text,
    extract(epoch from coalesce(
      message.sent_at,
      message.canceled_at,
      message.terminal_failed_at,
      message.updated_at
    ))::text
  ),
  coalesce(
    message.sent_at,
    message.canceled_at,
    message.terminal_failed_at,
    message.updated_at
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'delivery_generation', message.delivery_generation,
    'message_key', message.message_key,
    'provider_message_id', message.provider_message_id,
    'scheduled_for', message.scheduled_for,
    'send_attempt_count', message.send_attempt_count,
    'status', message.status,
    'step_number', message.step_number
  ))
from public.recovery_messages as message
join public.failed_payments as payment on payment.id = message.failed_payment_id
where message.status in ('sent', 'canceled', 'failed_terminal', 'paused')
on conflict (source, source_event_id) do nothing;

insert into public.recovery_case_events (
  failed_payment_id, user_id, stripe_account_id, livemode, event_type,
  source, source_event_id, occurred_at, metadata
)
select
  message.failed_payment_id,
  message.user_id,
  payment.stripe_account_id,
  payment.livemode,
  'email_' || event.event_type,
  'provider_message_event',
  event.provider || ':' || event.provider_event_id,
  event.occurred_at,
  jsonb_strip_nulls(jsonb_build_object(
    'message_key', message.message_key,
    'provider', event.provider,
    'provider_event_type', event.provider_event_type,
    'provider_message_id', event.provider_message_id,
    'recovery_message_id', event.recovery_message_id,
    'step_number', message.step_number
  ))
from public.recovery_message_events as event
join public.recovery_messages as message on message.id = event.recovery_message_id
join public.failed_payments as payment on payment.id = message.failed_payment_id
on conflict (source, source_event_id) do nothing;

revoke all on function public.capture_failed_payment_stripe_event()
from public, anon, authenticated;
revoke all on function public.capture_recovery_case_transition_event()
from public, anon, authenticated;
revoke all on function public.capture_recovery_message_timeline_event()
from public, anon, authenticated;
revoke all on function public.capture_provider_message_timeline_event()
from public, anon, authenticated;

commit;
