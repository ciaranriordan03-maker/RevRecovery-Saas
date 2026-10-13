begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role, created_at, updated_at)
values (
  '75000000-0000-0000-0000-000000000001',
  'recipient-review@example.invalid',
  'authenticated', 'authenticated', now(), now()
);

insert into public.stripe_connections (
  id, user_id, stripe_account_id, livemode, access_token
) values (
  '76000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001',
  'acct_recipient_review', false, 'local-placeholder'
);

insert into public.recovery_account_settings (
  id, user_id, stripe_connection_id, stripe_account_id, livemode,
  recovery_mode, timezone
) values (
  '77000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0000-000000000001',
  'acct_recipient_review', false, 'test', 'Europe/Dublin'
);

select public.review_notification_test_recipient(
  '75000000-0000-0000-0000-000000000001',
  'propose',
  ' Owner+Alerts@Example.com '
);

select is(
  (select essential_notification_test_recipient_candidate
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  'owner+alerts@example.com',
  'proposal is normalized and stored separately'
);

select ok(
  (select essential_notification_test_recipient is null
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  'proposal does not approve a recipient'
);

select throws_ok(
  $$select public.review_notification_test_recipient(
    '75000000-0000-0000-0000-000000000001',
    'approve',
    'different@example.com'
  )$$,
  'P0001',
  'The proposed recipient must match the recipient being approved',
  'a different recipient cannot be approved'
);

select public.review_notification_test_recipient(
  '75000000-0000-0000-0000-000000000001',
  'approve',
  'owner+alerts@example.com'
);

select is(
  (select essential_notification_test_recipient
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  'owner+alerts@example.com',
  'the exact proposed recipient can be approved'
);

select is(
  (select count(*)::integer
   from public.recovery_notification_recipient_reviews
   where user_id = '75000000-0000-0000-0000-000000000001'
     and action in ('proposed', 'approved')),
  2,
  'proposal and approval have separate audit entries'
);

select is(
  (select essential_notifications_enabled
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  false,
  'recipient approval does not enable delivery'
);

select public.review_notification_test_recipient(
  '75000000-0000-0000-0000-000000000001',
  'propose',
  'replacement@example.com'
);

select ok(
  (select essential_notification_test_recipient is null
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  'a replacement proposal revokes the earlier approval'
);

select public.review_notification_test_recipient(
  '75000000-0000-0000-0000-000000000001',
  'clear',
  null
);

select ok(
  (select essential_notification_test_recipient_candidate is null
      and essential_notification_test_recipient is null
   from public.recovery_account_settings
   where id = '77000000-0000-0000-0000-000000000001'),
  'clear removes proposed and approved recipients'
);

select * from finish();

rollback;
