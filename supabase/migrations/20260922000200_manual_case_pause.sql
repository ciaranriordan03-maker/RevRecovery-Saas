begin;

-- A merchant pause is deliberately separate from automatic payment-method
-- pauses so only messages paused by this control can be safely resumed.
alter table public.failed_payments
  add column if not exists manual_outreach_paused_at timestamptz;

alter table public.recovery_messages
  add column if not exists manual_pause_previous_status text;

alter table public.recovery_messages
  drop constraint if exists recovery_messages_manual_pause_previous_status_check;
alter table public.recovery_messages
  add constraint recovery_messages_manual_pause_previous_status_check
  check (
    manual_pause_previous_status is null or
    manual_pause_previous_status in ('pending', 'scheduled', 'failed_retryable')
  ) not valid;
alter table public.recovery_messages
  validate constraint recovery_messages_manual_pause_previous_status_check;

create or replace function public.set_recovery_case_manual_pause(
  requested_user_id uuid,
  requested_failed_payment_id uuid,
  requested_paused boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.failed_payments%rowtype;
  changed_messages integer := 0;
  transition_time timestamptz := timezone('utc'::text, now());
begin
  select * into payment
  from public.failed_payments
  where id = requested_failed_payment_id
    and user_id = requested_user_id
  for update;

  if payment.id is null then
    raise exception 'Recovery case not found';
  end if;

  if payment.case_status in (
    'recovered', 'exhausted', 'canceled_by_merchant', 'no_longer_applicable'
  ) then
    raise exception 'Resolved recovery cases cannot be paused or resumed';
  end if;

  if requested_paused then
    if payment.manual_outreach_paused_at is not null then
      return jsonb_build_object(
        'changed_messages', 0,
        'manual_outreach_paused_at', payment.manual_outreach_paused_at,
        'paused', true
      );
    end if;

    update public.recovery_messages
    set manual_pause_previous_status = status,
        status = 'paused'
    where failed_payment_id = payment.id
      and user_id = requested_user_id
      and status in ('pending', 'scheduled', 'failed_retryable')
      and manual_pause_previous_status is null;
    get diagnostics changed_messages = row_count;

    update public.failed_payments
    set manual_outreach_paused_at = transition_time,
        state_version = state_version + 1
    where id = payment.id;

    insert into public.recovery_case_transitions (
      failed_payment_id, user_id, from_status, to_status, reason, metadata
    ) values (
      payment.id, requested_user_id, payment.case_status, payment.case_status,
      'manual_outreach_paused',
      jsonb_build_object('changed_messages', changed_messages)
    );

    return jsonb_build_object(
      'changed_messages', changed_messages,
      'manual_outreach_paused_at', transition_time,
      'paused', true
    );
  end if;

  if payment.manual_outreach_paused_at is null then
    return jsonb_build_object(
      'changed_messages', 0,
      'manual_outreach_paused_at', null,
      'paused', false
    );
  end if;

  update public.recovery_messages
  set status = manual_pause_previous_status,
      manual_pause_previous_status = null
  where failed_payment_id = payment.id
    and user_id = requested_user_id
    and status = 'paused'
    and manual_pause_previous_status in ('pending', 'scheduled', 'failed_retryable');
  get diagnostics changed_messages = row_count;

  update public.failed_payments
  set manual_outreach_paused_at = null,
      state_version = state_version + 1
  where id = payment.id;

  insert into public.recovery_case_transitions (
    failed_payment_id, user_id, from_status, to_status, reason, metadata
  ) values (
    payment.id, requested_user_id, payment.case_status, payment.case_status,
    'manual_outreach_resumed',
    jsonb_build_object('changed_messages', changed_messages)
  );

  return jsonb_build_object(
    'changed_messages', changed_messages,
    'manual_outreach_paused_at', null,
    'paused', false
  );
end;
$$;

revoke all on function public.set_recovery_case_manual_pause(uuid, uuid, boolean)
from public, anon, authenticated;
grant execute on function public.set_recovery_case_manual_pause(uuid, uuid, boolean)
to service_role;

commit;
