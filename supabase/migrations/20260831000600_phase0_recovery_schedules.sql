begin;

-- Existing connections keep the exact immediate / 24-hour / 72-hour behavior
-- until a merchant explicitly publishes a different schedule.
do $$
declare
  settings_row public.recovery_account_settings%rowtype;
  policy_id uuid;
begin
  for settings_row in
    select * from public.recovery_account_settings
    where active_policy_version_id is null
    for update
  loop
    insert into public.recovery_policy_versions (
      account_settings_id, version, status, timezone, configuration, published_at
    ) values (
      settings_row.id,
      1,
      'published',
      settings_row.timezone,
      jsonb_build_object(
        'scheduleId', 'legacy_24_72',
        'offsetsMinutes', jsonb_build_array(0, 1440, 4320),
        'offsetSemantics', 'elapsed_minutes'
      ),
      timezone('utc'::text, now())
    )
    returning id into policy_id;

    insert into public.recovery_policy_steps (
      policy_version_id, step_number, offset_minutes, channel
    ) values
      (policy_id, 1, 0, 'email'),
      (policy_id, 2, 1440, 'email'),
      (policy_id, 3, 4320, 'email');

    update public.recovery_account_settings
    set active_policy_version_id = policy_id
    where id = settings_row.id;
  end loop;
end;
$$;

create or replace function public.publish_recovery_policy(
  requested_user_id uuid,
  requested_connection_id uuid,
  requested_mode text,
  requested_approved_test_recipient text,
  requested_timezone text,
  requested_schedule_id text,
  requested_offsets integer[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_row public.recovery_account_settings%rowtype;
  next_version integer;
  policy_id uuid;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from requested_user_id then
    raise exception 'Recovery policy access denied';
  end if;

  if cardinality(requested_offsets) <> 3
     or requested_offsets[1] <> 0
     or requested_offsets[2] <= requested_offsets[1]
     or requested_offsets[3] <= requested_offsets[2] then
    raise exception 'Recovery policy offsets are invalid';
  end if;

  if requested_mode not in ('off', 'test', 'live', 'paused') then
    raise exception 'Recovery mode is invalid';
  end if;

  if requested_mode = 'test' and nullif(trim(requested_approved_test_recipient), '') is null then
    raise exception 'A test recipient is required in test mode';
  end if;

  if requested_schedule_id not in ('legacy_24_72', 'day_3_7', 'day_2_5', 'day_5_10') then
    raise exception 'Recovery schedule is invalid';
  end if;

  select * into settings_row
  from public.recovery_account_settings
  where user_id = requested_user_id
    and stripe_connection_id = requested_connection_id
  for update;

  if not found then
    raise exception 'Recovery account settings not found';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.recovery_policy_versions
  where account_settings_id = settings_row.id;

  update public.recovery_policy_versions
  set status = 'retired'
  where account_settings_id = settings_row.id
    and status = 'published';

  insert into public.recovery_policy_versions (
    account_settings_id, version, status, timezone, configuration, published_at
  ) values (
    settings_row.id,
    next_version,
    'published',
    requested_timezone,
    jsonb_build_object(
      'scheduleId', requested_schedule_id,
      'offsetsMinutes', to_jsonb(requested_offsets),
      'offsetSemantics', 'elapsed_minutes'
    ),
    timezone('utc'::text, now())
  )
  returning id into policy_id;

  insert into public.recovery_policy_steps (
    policy_version_id, step_number, offset_minutes, channel
  )
  select policy_id, step.ordinality::integer, step.offset_minutes, 'email'
  from unnest(requested_offsets) with ordinality as step(offset_minutes, ordinality);

  update public.recovery_account_settings
  set active_policy_version_id = policy_id,
      approved_test_recipient = nullif(trim(requested_approved_test_recipient), ''),
      paused_at = case when requested_mode = 'paused' then timezone('utc'::text, now()) else null end,
      paused_reason = case when requested_mode = 'paused' then 'merchant_paused' else null end,
      recovery_mode = requested_mode,
      timezone = requested_timezone,
      updated_at = timezone('utc'::text, now())
  where id = settings_row.id;

  return policy_id;
end;
$$;

revoke all on function public.publish_recovery_policy(uuid, uuid, text, text, text, text, integer[]) from public, anon, authenticated;
grant execute on function public.publish_recovery_policy(uuid, uuid, text, text, text, text, integer[]) to service_role;

commit;
