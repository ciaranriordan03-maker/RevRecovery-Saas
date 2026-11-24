begin;

create index cancellation_test_email_suppressed_recipient_idx
  on public.cancellation_test_email_authorizations (recipient_email, id)
  where not livemode;
create index cancellation_test_email_suppression_evidence_idx
  on public.cancellation_test_email_evidence (authorization_id)
  where suppression_reason is not null;

-- The request, approval, and reservation RPCs all resolve this context. A
-- signed hard bounce, complaint, or provider suppression for the exact inbox
-- stops subsequent use of that inbox in the cancellation test lane, including
-- a different test account. Do not propagate it into ordinary recovery mail.
create or replace function public.cancellation_test_email_context(
  requested_case_id uuid,
  requested_recipient text
)
returns table (
  case_user_id uuid, account_id text, domain text, sender_id text,
  verified_at timestamptz, scheduled_end timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select c.user_id, c.stripe_account_id, d.domain, d.provider_domain_id,
         d.verified_at, coalesce(c.cancel_at, c.current_period_end)
  from public.cancellation_cases c
  join public.stripe_connections sc on sc.user_id = c.user_id
    and sc.stripe_account_id = c.stripe_account_id and sc.livemode = false
    and sc.status = 'connected'
  join public.recovery_sending_domains d on d.user_id = c.user_id
    and d.status = 'verified' and d.verified_at is not null
    and nullif(btrim(d.provider_domain_id), '') is not null
  where c.id = requested_case_id and not c.livemode
    and c.status = 'shadow' and c.cancel_at_period_end
    and c.subscription_status in ('active', 'trialing', 'past_due', 'unpaid')
    and coalesce(c.cancel_at, c.current_period_end) > clock_timestamp()
    and not exists (
      select 1 from public.recovery_recipient_suppressions s
      where s.user_id = c.user_id and s.normalized_recipient_email = requested_recipient
    )
    and not exists (
      select 1
      from public.cancellation_test_email_authorizations a
      join public.cancellation_test_email_evidence e on e.authorization_id = a.id
      where not a.livemode
        and a.recipient_email = requested_recipient
        and e.suppression_reason is not null
    )
  for update of c
$$;

revoke all on function public.cancellation_test_email_context(uuid, text)
  from public, anon, authenticated, service_role;

commit;
