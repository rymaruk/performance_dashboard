-- Admin-only RPC: set another user's login password (bcrypt).
-- Run in Supabase SQL Editor. Requires: create extension if not exists pgcrypto;
-- On Supabase, crypt/gen_salt live in schema "extensions" — use qualified names.

create or replace function public.admin_set_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if new_password is null or length(trim(new_password)) < 6 then
    raise exception 'Пароль має бути не коротшим за 6 символів';
  end if;
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Доступ заборонено';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(trim(new_password), extensions.gen_salt('bf'::text)),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Користувача не знайдено';
  end if;
end;
$$;

revoke all on function public.admin_set_user_password(uuid, text) from public;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
