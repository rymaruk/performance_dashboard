-- ============================================================
-- Seed Admin User — run AFTER supabase-schema.sql
-- ============================================================
-- Credentials:
--   email:    admin@dashboard.local
--   password: Admin123!
-- ============================================================

do $$
declare
  admin_uid uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- 1. Insert into auth.users (skip if already exists)
  if not exists (select 1 from auth.users where id = admin_uid) then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@dashboard.local',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "System", "last_name": "Admin", "login": "admin", "role": "admin"}',
      false,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end if;

  -- 2. Insert identity record (required for email/password login)
  if not exists (
    select 1 from auth.identities
    where provider = 'email' and provider_id = 'admin@dashboard.local'
  ) then
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      admin_uid,
      admin_uid,
      'admin@dashboard.local',
      jsonb_build_object(
        'sub', admin_uid::text,
        'email', 'admin@dashboard.local',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  -- 3. Make sure the public.users profile row exists
  --    (the trigger should have created it, but just in case)
  if not exists (select 1 from public.users where id = admin_uid) then
    insert into public.users (id, first_name, last_name, email, login, role, team_id)
    values (admin_uid, 'System', 'Admin', 'admin@dashboard.local', 'admin', 'admin', null);
  end if;

end;
$$;
