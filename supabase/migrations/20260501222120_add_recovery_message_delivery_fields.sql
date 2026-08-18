alter table public.recovery_messages
add column if not exists last_error text,
add column if not exists send_attempt_count integer not null default 0,
add column if not exists sent_to_email text;

create index if not exists recovery_messages_status_attempts_idx
on public.recovery_messages (status, send_attempt_count);
