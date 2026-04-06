-- ============================================================
-- Manually confirm email for Supabase Auth users
-- Run in Supabase SQL Editor (Dashboard → SQL).
-- Fixes login error: "Email not confirmed" when signups require confirmation.
-- ============================================================

-- 1) Single user: replace with the real address, then run this block.
do $$
declare
  target_email text := 'user@example.com';  -- ← CHANGE THIS
begin
  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc'::text, now())),
    confirmation_token = '',
    updated_at = timezone('utc'::text, now())
  where lower(email) = lower(target_email);

  if not found then
    raise exception 'No auth.users row for email: %', target_email;
  end if;

  update auth.identities
  set
    identity_data = jsonb_set(
      coalesce(identity_data, '{}'::jsonb),
      '{email_verified}',
      'true'::jsonb,
      true
    ),
    updated_at = timezone('utc'::text, now())
  where provider = 'email'
    and lower(provider_id) = lower(target_email);
end;
$$;

-- ============================================================
-- 2) Optional: confirm ALL users who are still unconfirmed
--    (dev/staging only — do not run blindly in production)
-- ============================================================
/*
update auth.users
set
  email_confirmed_at = timezone('utc'::text, now()),
  confirmation_token = '',
  updated_at = timezone('utc'::text, now())
where email_confirmed_at is null;

update auth.identities i
set
  identity_data = jsonb_set(
    coalesce(i.identity_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  ),
  updated_at = timezone('utc'::text, now())
where i.provider = 'email'
  and exists (
    select 1 from auth.users u
    where u.id = i.user_id
      and u.email_confirmed_at is not null
  );
*/
