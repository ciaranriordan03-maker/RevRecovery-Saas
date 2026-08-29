begin;

-- Backfill the new state column without changing the legacy fields that the
-- current UI still reads during the phased rollout.
update public.failed_payments
set case_status = case
  when status = 'recovered' or recovery_stage = 'recovered' then 'recovered'
  else 'active'
end
where case_status is null;

update public.failed_payments as payment
set livemode = connection.livemode
from public.stripe_connections as connection
where payment.livemode is null
  and payment.stripe_account_id = connection.stripe_account_id
  and connection.livemode is not null;

create or replace function public.is_recovery_case_transition_allowed(
  from_status text,
  to_status text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when to_status is null then true
    when from_status = to_status then true
    when from_status is null then to_status = 'detected'
    when from_status = 'detected' then to_status in (
      'active', 'canceled_by_merchant', 'no_longer_applicable', 'failed_operationally'
    )
    when from_status in ('active', 'awaiting_retry', 'payment_method_updated', 'failed_operationally') then
      to_status in (
        'active', 'awaiting_retry', 'payment_method_updated', 'recovered',
        'exhausted', 'canceled_by_merchant', 'no_longer_applicable',
        'failed_operationally'
      )
    else false
  end;
$$;

create or replace function public.record_stripe_invoice_event(
  requested_user_id uuid,
  requested_stripe_account_id text,
  requested_livemode boolean,
  requested_stripe_event_id text,
  requested_event_created_at timestamptz,
  requested_event_type text,
  requested_stripe_invoice_id text,
  requested_stripe_customer_id text,
  requested_stripe_subscription_id text,
  requested_stripe_payment_intent_id text,
  requested_stripe_charge_id text,
  requested_amount_due bigint,
  requested_amount_paid bigint,
  requested_currency text,
  requested_attempt_count integer,
  requested_next_payment_attempt_at timestamptz,
  requested_invoice_status text,
  requested_invoice_kind text,
  requested_billing_reason text,
  requested_failure_code text,
  requested_decline_code text,
  requested_failure_message text,
  requested_target_status text,
  requested_terminal_reason text,
  requested_payload jsonb
)
returns setof public.failed_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.failed_payments%rowtype;
  previous_status text;
  effective_target text;
  transition_time timestamptz := timezone('utc'::text, now());
begin
  if requested_event_type not in (
    'invoice.payment_failed', 'invoice.paid',
    'invoice.payment_succeeded', 'invoice.updated'
  ) then
    raise exception 'Unsupported invoice event type';
  end if;

  if not exists (
    select 1
    from public.stripe_connections as connection
    where connection.user_id = requested_user_id
      and connection.stripe_account_id = requested_stripe_account_id
      and (connection.livemode is null or connection.livemode = requested_livemode)
  ) then
    raise exception 'Stripe connection or environment mismatch';
  end if;

  select * into payment
  from public.failed_payments
  where stripe_invoice_id = requested_stripe_invoice_id
    and stripe_account_id = requested_stripe_account_id
  for update;

  if not found then
    if requested_event_type <> 'invoice.payment_failed' then
      return;
    end if;

    -- A delayed failure must not reopen an invoice that a newer success event
    -- already settled before this worker received the failure event.
    if exists (
      select 1
      from public.stripe_webhook_events as later_event
      where later_event.stripe_account_id = requested_stripe_account_id
        and (
          later_event.event_type in ('invoice.paid', 'invoice.payment_succeeded')
          or (
            later_event.event_type = 'invoice.updated'
            and later_event.payload #>> '{data,object,status}' in ('paid', 'void', 'uncollectible')
          )
        )
        and later_event.event_created_at >= requested_event_created_at
        and later_event.payload #>> '{data,object,id}' = requested_stripe_invoice_id
        and later_event.status in ('processed', 'processing')
    ) then
      return;
    end if;

    insert into public.failed_payments (
      user_id, stripe_account_id, stripe_customer_id, stripe_subscription_id,
      stripe_invoice_id, amount_due, amount_paid, currency, attempt_count,
      next_payment_attempt_at, status, recovery_stage, case_status, livemode,
      state_version, latest_stripe_event_id, latest_event_created_at,
      stripe_payment_intent_id, stripe_charge_id, invoice_kind, billing_reason,
      invoice_status, failure_code, decline_code, failure_message,
      last_event_type, latest_payload
    ) values (
      requested_user_id, requested_stripe_account_id, requested_stripe_customer_id,
      requested_stripe_subscription_id, requested_stripe_invoice_id,
      requested_amount_due, requested_amount_paid, requested_currency,
      greatest(coalesce(requested_attempt_count, 0), 0),
      requested_next_payment_attempt_at, 'failed', 'email_1_pending', 'detected',
      requested_livemode, 1, requested_stripe_event_id,
      requested_event_created_at, requested_stripe_payment_intent_id,
      requested_stripe_charge_id, coalesce(requested_invoice_kind, 'unknown'),
      requested_billing_reason, requested_invoice_status, requested_failure_code,
      requested_decline_code, requested_failure_message,
      requested_event_type, coalesce(requested_payload, '{}'::jsonb)
    )
    returning * into payment;

    insert into public.recovery_case_transitions (
      failed_payment_id, user_id, stripe_event_id, from_status, to_status,
      reason, metadata
    ) values (
      payment.id, requested_user_id, requested_stripe_event_id, null, 'detected',
      'invoice_payment_failed', jsonb_build_object('event_type', requested_event_type)
    );
  else
    if payment.livemode is not null and payment.livemode <> requested_livemode then
      raise exception 'Stripe environment mismatch for recovery case';
    end if;

    if payment.latest_event_created_at is not null
       and requested_event_created_at is not null
       and requested_event_created_at < payment.latest_event_created_at then
      return query select * from public.failed_payments where id = payment.id;
      return;
    end if;

    if payment.latest_stripe_event_id = requested_stripe_event_id then
      return query select * from public.failed_payments where id = payment.id;
      return;
    end if;

    previous_status := payment.case_status;
    effective_target := requested_target_status;

    if effective_target is not null
       and not public.is_recovery_case_transition_allowed(previous_status, effective_target) then
      -- Terminal cases cannot be reopened or have their settled event context
      -- replaced by late or contradictory Stripe events.
      return query select * from public.failed_payments where id = payment.id;
      return;
    end if;

    update public.failed_payments
    set stripe_customer_id = coalesce(requested_stripe_customer_id, stripe_customer_id),
        stripe_subscription_id = coalesce(requested_stripe_subscription_id, stripe_subscription_id),
        stripe_payment_intent_id = coalesce(requested_stripe_payment_intent_id, stripe_payment_intent_id),
        stripe_charge_id = coalesce(requested_stripe_charge_id, stripe_charge_id),
        amount_due = requested_amount_due,
        amount_paid = requested_amount_paid,
        currency = requested_currency,
        attempt_count = greatest(coalesce(requested_attempt_count, 0), attempt_count),
        next_payment_attempt_at = requested_next_payment_attempt_at,
        invoice_kind = coalesce(requested_invoice_kind, invoice_kind, 'unknown'),
        billing_reason = requested_billing_reason,
        invoice_status = requested_invoice_status,
        failure_code = coalesce(requested_failure_code, failure_code),
        decline_code = coalesce(requested_decline_code, decline_code),
        failure_message = coalesce(requested_failure_message, failure_message),
        latest_stripe_event_id = requested_stripe_event_id,
        latest_event_created_at = requested_event_created_at,
        last_event_type = requested_event_type,
        latest_payload = coalesce(requested_payload, latest_payload),
        livemode = coalesce(livemode, requested_livemode),
        state_version = state_version + 1
    where id = payment.id
    returning * into payment;
  end if;

  previous_status := coalesce(previous_status, payment.case_status);
  effective_target := requested_target_status;

  if effective_target is not null and effective_target <> previous_status then
    update public.failed_payments
    set case_status = effective_target,
        state_version = state_version + 1,
        terminal_reason = case
          when effective_target in ('recovered', 'exhausted', 'canceled_by_merchant', 'no_longer_applicable')
            then requested_terminal_reason
          else null
        end,
        terminal_at = case
          when effective_target in ('recovered', 'exhausted', 'canceled_by_merchant', 'no_longer_applicable')
            then transition_time
          else null
        end,
        recovered_at = case when effective_target = 'recovered' then transition_time else recovered_at end,
        status = case
          when effective_target = 'recovered' then 'recovered'
          when effective_target = 'active' then 'failed'
          when effective_target = 'awaiting_retry' then 'open'
          else effective_target
        end,
        recovery_stage = case
          when effective_target = 'active' then 'email_1_pending'
          else effective_target
        end
    where id = payment.id
    returning * into payment;

    insert into public.recovery_case_transitions (
      failed_payment_id, user_id, stripe_event_id, from_status, to_status,
      reason, metadata
    ) values (
      payment.id, requested_user_id, requested_stripe_event_id, previous_status,
      effective_target, coalesce(requested_terminal_reason, requested_event_type),
      jsonb_build_object(
        'event_type', requested_event_type,
        'invoice_status', requested_invoice_status
      )
    );

    update public.recovery_sequences
    set status = effective_target,
        completed_at = case when effective_target = 'recovered' then transition_time else completed_at end,
        canceled_at = case
          when effective_target in ('canceled_by_merchant', 'no_longer_applicable') then transition_time
          else canceled_at
        end,
        terminal_reason = case
          when effective_target in ('recovered', 'exhausted', 'canceled_by_merchant', 'no_longer_applicable')
            then requested_terminal_reason
          else terminal_reason
        end
    where failed_payment_id = payment.id;

    if effective_target in ('recovered', 'canceled_by_merchant', 'no_longer_applicable') then
      update public.recovery_messages
      set status = 'canceled',
          canceled_at = transition_time,
          claim_token = null,
          claim_expires_at = null
      where failed_payment_id = payment.id
        and status in ('pending', 'scheduled', 'claimed', 'failed', 'failed_retryable', 'paused');
    elsif effective_target = 'awaiting_retry' then
      update public.recovery_messages
      set status = 'pending',
          claim_token = null,
          claim_expires_at = null
      where failed_payment_id = payment.id and status = 'paused';
    end if;
  end if;

  return query select * from public.failed_payments where id = payment.id;
end;
$$;

create or replace function public.pause_recovery_cases_for_payment_method(
  requested_user_id uuid,
  requested_stripe_account_id text,
  requested_livemode boolean,
  requested_stripe_customer_id text,
  requested_stripe_event_id text,
  requested_event_created_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment record;
  affected integer := 0;
  transition_time timestamptz := timezone('utc'::text, now());
begin
  for payment in
    select id, case_status
    from public.failed_payments
    where user_id = requested_user_id
      and stripe_account_id = requested_stripe_account_id
      and stripe_customer_id = requested_stripe_customer_id
      and coalesce(livemode, requested_livemode) = requested_livemode
      and case_status in ('detected', 'active', 'awaiting_retry', 'failed_operationally')
      and (latest_event_created_at is null or requested_event_created_at >= latest_event_created_at)
    for update
  loop
    update public.failed_payments
    set case_status = 'payment_method_updated',
        recovery_stage = 'payment_method_updated',
        outreach_paused_at = transition_time,
        latest_stripe_event_id = requested_stripe_event_id,
        latest_event_created_at = requested_event_created_at,
        last_event_type = 'payment_method.updated',
        state_version = state_version + 1
    where id = payment.id;

    insert into public.recovery_case_transitions (
      failed_payment_id, user_id, stripe_event_id, from_status, to_status, reason
    ) values (
      payment.id, requested_user_id, requested_stripe_event_id,
      payment.case_status, 'payment_method_updated', 'awaiting_payment_retry_result'
    );

    update public.recovery_sequences
    set status = 'payment_method_updated'
    where failed_payment_id = payment.id;

    update public.recovery_messages
    set status = 'paused'
    where failed_payment_id = payment.id
      and status in ('pending', 'scheduled', 'failed', 'failed_retryable');

    affected := affected + 1;
  end loop;

  return affected;
end;
$$;

revoke all on function public.is_recovery_case_transition_allowed(text, text) from public;
revoke all on function public.record_stripe_invoice_event(
  uuid, text, boolean, text, timestamptz, text, text, text, text, text, text,
  bigint, bigint, text, integer, timestamptz, text, text, text, text, text,
  text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.pause_recovery_cases_for_payment_method(
  uuid, text, boolean, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.is_recovery_case_transition_allowed(text, text) to service_role;
grant execute on function public.record_stripe_invoice_event(
  uuid, text, boolean, text, timestamptz, text, text, text, text, text, text,
  bigint, bigint, text, integer, timestamptz, text, text, text, text, text,
  text, text, text, jsonb
) to service_role;
grant execute on function public.pause_recovery_cases_for_payment_method(
  uuid, text, boolean, text, text, timestamptz
) to service_role;

commit;
