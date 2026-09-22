begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  (
    '60000000-0000-0000-0000-000000000001',
    'manual-pause@example.invalid',
    'authenticated', 'authenticated', now(), now()
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'manual-pause-other@example.invalid',
    'authenticated', 'authenticated', now(), now()
  );

do $$
declare
  payment_id uuid;
  sequence_id uuid;
  result jsonb;
begin
  insert into public.failed_payments (
    user_id, stripe_account_id, stripe_invoice_id, status, recovery_stage,
    case_status, last_event_type
  ) values (
    '60000000-0000-0000-0000-000000000001', 'acct_manual_pause',
    'in_manual_pause', 'failed', 'email_1_pending', 'active',
    'invoice.payment_failed'
  ) returning id into payment_id;

  insert into public.recovery_sequences (
    user_id, failed_payment_id, stripe_account_id, stripe_invoice_id, status
  ) values (
    '60000000-0000-0000-0000-000000000001', payment_id,
    'acct_manual_pause', 'in_manual_pause', 'active'
  ) returning id into sequence_id;

  insert into public.recovery_messages (
    sequence_id, failed_payment_id, user_id, message_key, step_number,
    scheduled_for, status
  ) values
    (
      sequence_id, payment_id,
      '60000000-0000-0000-0000-000000000001', 'email_1', 1,
      now() + interval '1 day', 'pending'
    ),
    (
      sequence_id, payment_id,
      '60000000-0000-0000-0000-000000000001', 'email_2', 2,
      now() + interval '2 days', 'paused'
    );

  result := public.set_recovery_case_manual_pause(
    '60000000-0000-0000-0000-000000000001', payment_id, true
  );
  assert (result ->> 'paused')::boolean, 'pause result was not true';
  assert (result ->> 'changed_messages')::integer = 1,
    'manual pause changed the wrong number of messages';
  assert (
    select manual_outreach_paused_at is not null
    from public.failed_payments where id = payment_id
  ), 'case did not retain manual pause state';
  assert (
    select status = 'paused' and manual_pause_previous_status = 'pending'
    from public.recovery_messages where message_key = 'email_1'
  ), 'pending message did not retain its resumable status';
  assert (
    select status = 'paused' and manual_pause_previous_status is null
    from public.recovery_messages where message_key = 'email_2'
  ), 'automatic pause was incorrectly claimed by the manual control';

  begin
    perform public.set_recovery_case_manual_pause(
      '60000000-0000-0000-0000-000000000002', payment_id, false
    );
    raise exception 'other tenant changed the case';
  exception
    when others then
      if sqlerrm = 'other tenant changed the case' then
        raise;
      end if;
  end;

  result := public.set_recovery_case_manual_pause(
    '60000000-0000-0000-0000-000000000001', payment_id, false
  );
  assert not (result ->> 'paused')::boolean, 'resume result was not false';
  assert (
    select status = 'pending' and manual_pause_previous_status is null
    from public.recovery_messages where message_key = 'email_1'
  ), 'manually paused message did not resume';
  assert (
    select status = 'paused' and manual_pause_previous_status is null
    from public.recovery_messages where message_key = 'email_2'
  ), 'automatic pause was incorrectly resumed';
  assert (
    select count(*) = 2
    from public.recovery_case_transitions
    where failed_payment_id = payment_id
      and reason in ('manual_outreach_paused', 'manual_outreach_resumed')
  ), 'manual actions were not recorded in case history';
end;
$$;

select pass('manual case pause is reversible, tenant-scoped, and audit-safe');
select * from finish();

rollback;
