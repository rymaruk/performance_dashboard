-- Non-admins may update only their own profile fields: first_name, last_name, email.
-- They cannot change role, login, team_id, or color (those remain admin-only via Users page / service).
-- Admins are unrestricted. Run in Supabase SQL Editor after public.users exists.

create or replace function public.restrict_non_admin_user_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role = 'admin' then
    return new;
  end if;

  if new.id is distinct from auth.uid() then
    raise exception 'Немає прав на оновлення цього профілю';
  end if;

  if new.role is distinct from old.role
     or new.login is distinct from old.login
     or new.team_id is distinct from old.team_id
     or new.color is distinct from old.color
  then
    raise exception 'Немає прав на зміну цих полів';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restrict_non_admin_user_self_update on public.users;
create trigger trg_restrict_non_admin_user_self_update
  before update on public.users
  for each row execute function public.restrict_non_admin_user_self_update();
