alter table public.failed_payments
  add column if not exists audience_segment text not null default 'unknown',
  add column if not exists segment_snapshot jsonb not null default '{}'::jsonb;

alter table public.failed_payments
  drop constraint if exists failed_payments_audience_segment_check;

alter table public.failed_payments
  add constraint failed_payments_audience_segment_check
  check (audience_segment in ('subscription', 'standalone', 'unknown')) not valid;

alter table public.failed_payments
  validate constraint failed_payments_audience_segment_check;

alter table public.recovery_sequences
  add column if not exists audience_segment text not null default 'unknown';

alter table public.recovery_sequences
  drop constraint if exists recovery_sequences_audience_segment_check;

alter table public.recovery_sequences
  add constraint recovery_sequences_audience_segment_check
  check (audience_segment in ('subscription', 'standalone', 'unknown')) not valid;

alter table public.recovery_sequences
  validate constraint recovery_sequences_audience_segment_check;

create index if not exists failed_payments_user_segment_created_idx
on public.failed_payments (user_id, audience_segment, created_at desc);

create index if not exists recovery_sequences_user_segment_started_idx
on public.recovery_sequences (user_id, audience_segment, started_at desc);

update public.failed_payments
set audience_segment = case
  when invoice_kind = 'subscription' then 'subscription'
  when invoice_kind = 'standalone' then 'standalone'
  else 'unknown'
end;

update public.recovery_sequences as sequence
set audience_segment = payment.audience_segment
from public.failed_payments as payment
where sequence.failed_payment_id = payment.id;
