-- Admin-only: оновлення профілю користувача в public.users та email в auth.users.
-- Після застосування: Settings → API → перезавантажте кеш схеми (за потреби).

create or replace function public.admin_update_user_profile(
  target_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_login text,
  p_role text,
  p_team_id uuid,
  p_color text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Доступ заборонено';
  end if;

  if v_email is null or length(v_email) < 3 then
    raise exception 'Вкажіть коректний email';
  end if;
  if p_first_name is null or length(trim(p_first_name)) < 1 then
    raise exception 'Вкажіть імʼя';
  end if;
  if p_last_name is null or length(trim(p_last_name)) < 1 then
    raise exception 'Вкажіть прізвище';
  end if;
  if p_login is null or length(trim(p_login)) < 1 then
    raise exception 'Вкажіть логін';
  end if;
  if p_role is null or p_role not in ('admin', 'user') then
    raise exception 'Некоректна роль';
  end if;

  update auth.users
  set
    email = v_email,
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'Обліковий запис не знайдено в auth';
  end if;

  update public.users
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    email = v_email,
    login = trim(p_login),
    role = p_role,
    team_id = p_team_id,
    color = case
      when p_color is null or btrim(p_color) = '' then null
      else btrim(p_color)
    end
  where id = target_user_id;

  if not found then
    raise exception 'Профіль не знайдено в public.users';
  end if;
end;
$$;

revoke all on function public.admin_update_user_profile(uuid, text, text, text, text, text, uuid, text) from public;
grant execute on function public.admin_update_user_profile(uuid, text, text, text, text, text, uuid, text) to authenticated;
