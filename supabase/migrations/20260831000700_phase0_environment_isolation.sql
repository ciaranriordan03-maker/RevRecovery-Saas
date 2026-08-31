-- Phase 0: isolate Stripe customer state by live/test environment.

begin;

update public.stripe_customer_states as customer_state
set livemode = connection.livemode
from public.stripe_connections as connection
where customer_state.livemode is null
  and connection.stripe_account_id = customer_state.stripe_account_id
  and connection.user_id = customer_state.user_id
  and connection.livemode is not null;

alter table public.stripe_customer_states
  drop constraint if exists stripe_customer_states_stripe_account_id_stripe_customer_id_key;

drop index if exists public.stripe_customer_states_account_mode_customer_idx;

create unique index if not exists stripe_customer_states_account_mode_customer_uidx
on public.stripe_customer_states (stripe_account_id, livemode, stripe_customer_id);

create index if not exists failed_payments_account_mode_invoice_idx
on public.failed_payments (stripe_account_id, livemode, stripe_invoice_id);

commit;
