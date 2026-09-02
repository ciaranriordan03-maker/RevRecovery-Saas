begin;

-- Provider delivery facts are intentionally separate from the worker's send
-- state. A bounce or complaint does not mean that the Stripe invoice recovered.
alter table public.recovery_messages
  add column if not exists provider_delivery_status text,
  add column if not exists provider_delivery_occurred_at timestamptz;

alter table public.recovery_messages
  add constraint recovery_messages_provider_delivery_status_check
  check (
    provider_delivery_status is null or provider_delivery_status in (
      'scheduled', 'sent', 'delivered', 'delivery_delayed', 'bounced',
      'complained', 'failed', 'suppressed', 'canceled'
    )
  ) not valid;

create table if not exists public.recovery_recipient_suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  normalized_recipient_email text not null,
  reason text not null check (reason in ('bounced', 'complained', 'suppressed')),
  provider text not null default 'resend' check (provider = 'resend'),
  provider_event_id text not null,
  recovery_message_id uuid references public.recovery_messages(id) on delete set null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, normalized_recipient_email),
  check (normalized_recipient_email = lower(btrim(recipient_email)))
);

create index if not exists recovery_recipient_suppressions_user_idx
on public.recovery_recipient_suppressions (user_id, occurred_at desc);

alter table public.recovery_recipient_suppressions enable row level security;

drop policy if exists "Users can view their own recovery recipient suppressions"
on public.recovery_recipient_suppressions;

create policy "Users can view their own recovery recipient suppressions"
on public.recovery_recipient_suppressions
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.recovery_recipient_suppressions from anon;
revoke insert, update, delete on table public.recovery_recipient_suppressions from authenticated;
grant select on table public.recovery_recipient_suppressions to authenticated;
grant select, insert, update on table public.recovery_recipient_suppressions to service_role;

create or replace function public.record_recovery_message_event(
  requested_event_type text,
  requested_metadata jsonb,
  requested_occurred_at timestamptz,
  requested_provider_event_id text,
  requested_provider_event_type text,
  requested_provider_message_id text,
  requested_should_suppress boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_event_id uuid;
  matched_message public.recovery_messages%rowtype;
  normalized_email text;
  requested_rank integer;
  current_rank integer;
begin
  select message.*
  into matched_message
  from public.recovery_messages as message
  where message.provider_message_id = requested_provider_message_id
  order by message.created_at desc
  limit 1
  for update;

  insert into public.recovery_message_events (
    event_type, metadata, occurred_at, provider, provider_event_id,
    provider_event_type, provider_message_id, recovery_message_id, user_id
  ) values (
    requested_event_type, coalesce(requested_metadata, '{}'::jsonb),
    requested_occurred_at, 'resend', requested_provider_event_id,
    requested_provider_event_type, requested_provider_message_id,
    matched_message.id, matched_message.user_id
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return jsonb_build_object(
      'inserted', false,
      'matched', matched_message.id is not null
    );
  end if;

  if matched_message.id is not null and requested_event_type <> 'unknown' then
    requested_rank := case requested_event_type
      when 'scheduled' then 10 when 'sent' then 20
      when 'delivery_delayed' then 25 when 'delivered' then 30
      when 'failed' then 40 when 'canceled' then 40
      when 'bounced' then 50 when 'suppressed' then 60
      when 'complained' then 70 else 0 end;
    current_rank := case matched_message.provider_delivery_status
      when 'scheduled' then 10 when 'sent' then 20
      when 'delivery_delayed' then 25 when 'delivered' then 30
      when 'failed' then 40 when 'canceled' then 40
      when 'bounced' then 50 when 'suppressed' then 60
      when 'complained' then 70 else 0 end;

    if requested_rank > current_rank or (
      requested_rank = current_rank and
      requested_occurred_at >= coalesce(
        matched_message.provider_delivery_occurred_at,
        '-infinity'::timestamptz
      )
    ) then
      update public.recovery_messages
      set provider_delivery_status = requested_event_type,
          provider_delivery_occurred_at = requested_occurred_at
      where id = matched_message.id;
    end if;
  end if;

  if requested_should_suppress
    and requested_event_type in ('bounced', 'complained', 'suppressed')
    and matched_message.sent_to_email is not null
  then
    normalized_email := lower(btrim(matched_message.sent_to_email));

    insert into public.recovery_recipient_suppressions (
      user_id, recipient_email, normalized_recipient_email, reason, provider,
      provider_event_id, recovery_message_id, occurred_at
    ) values (
      matched_message.user_id, normalized_email, normalized_email,
      requested_event_type, 'resend', requested_provider_event_id,
      matched_message.id, requested_occurred_at
    )
    on conflict (user_id, normalized_recipient_email) do update
    set reason = excluded.reason,
        provider_event_id = excluded.provider_event_id,
        recovery_message_id = excluded.recovery_message_id,
        occurred_at = excluded.occurred_at,
        updated_at = timezone('utc'::text, now())
    where excluded.occurred_at >= public.recovery_recipient_suppressions.occurred_at;

    update public.recovery_messages
    set canceled_at = timezone('utc'::text, now()),
        claim_token = null,
        claimed_at = null,
        claim_expires_at = null,
        last_error = 'Recipient suppressed after provider ' || requested_event_type || ' event.',
        status = 'canceled'
    where sequence_id = matched_message.sequence_id
      and id <> matched_message.id
      and status in ('pending', 'scheduled', 'failed_retryable', 'paused');
  end if;

  return jsonb_build_object('inserted', true, 'matched', matched_message.id is not null);
end;
$$;

revoke all on function public.record_recovery_message_event(
  text, jsonb, timestamptz, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.record_recovery_message_event(
  text, jsonb, timestamptz, text, text, text, boolean
) to service_role;

commit;
