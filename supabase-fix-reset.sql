-- ============================================================
-- FIX / RESET — Run this to clean up and re-apply everything.
-- Paste this entire file into the Supabase SQL Editor.
-- ============================================================

-- ============ DROP everything in reverse order ============

-- Drop triggers first
drop trigger if exists trg_protect_seed_admin_role on public.users;
drop trigger if exists trg_protect_seed_admin on public.users;
drop trigger if exists trg_check_team_deletable on public.teams;
drop trigger if exists on_auth_user_created on auth.users;

-- Drop functions
drop function if exists public.protect_seed_admin_role() cascade;
drop function if exists public.protect_seed_admin() cascade;
drop function if exists public.check_team_deletable() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_my_team_id() cascade;
drop function if exists public.get_my_role() cascade;

-- Drop policies
do $$
declare
  r record;
begin
  for r in (
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

-- Drop tables in reverse FK order
drop table if exists public.links cascade;
drop table if exists public.kpis cascade;
drop table if exists public.tasks cascade;
drop table if exists public.goals cascade;
drop table if exists public.projects cascade;
drop table if exists public.users cascade;
drop table if exists public.teams cascade;

-- Clean up ALL users from auth (public.users is already dropped so FK is gone)
do $$
begin
  -- Delete from all auth tables that reference auth.users
  delete from auth.identities;

  begin delete from auth.sessions;        exception when undefined_table then null; end;
  begin delete from auth.refresh_tokens;   exception when undefined_table then null; end;
  begin delete from auth.mfa_amr_claims;   exception when undefined_table then null; end;
  begin delete from auth.mfa_challenges;   exception when undefined_table then null; end;
  begin delete from auth.mfa_factors;      exception when undefined_table then null; end;
  begin delete from auth.flow_state;       exception when undefined_table then null; end;
  begin delete from auth.one_time_tokens;  exception when undefined_table then null; end;
  begin delete from auth.saml_relay_states; exception when undefined_table then null; end;
  begin delete from auth.sso_domains;      exception when undefined_table then null; end;

  -- Now safe to delete all auth users
  delete from auth.users;
end;
$$;

-- ============ RE-CREATE EVERYTHING ============

-- 0. Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'active'
               check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text unique not null,
  login      text unique not null,
  role       text not null default 'user'
               check (role in ('admin', 'user')),
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Новий проект',
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table public.goals (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete set null,
  title      text not null default '',
  owner      text not null default 'Команда',
  priority   text not null default '🟡 Середній',
  status     text not null default 'Планується',
  start_date date not null default current_date,
  end_date   date not null default (current_date + interval '90 days')::date,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals(id) on delete cascade,
  title       text not null default '',
  description text not null default '',
  assignee    text not null default 'SMM',
  status      text not null default 'To Do',
  start_date  date not null default current_date,
  end_date    date not null default (current_date + interval '14 days')::date,
  created_at  timestamptz not null default now()
);

create table public.kpis (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals(id) on delete cascade,
  name          text not null default '',
  current_value numeric not null default 0,
  target_value  numeric not null default 100,
  unit          text not null default '%'
);

create table public.links (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label   text not null default '',
  url     text not null default ''
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index idx_users_team    on public.users(team_id);
create index idx_goals_project on public.goals(project_id);
create index idx_goals_team    on public.goals(team_id);
create index idx_tasks_goal    on public.tasks(goal_id);
create index idx_kpis_goal     on public.kpis(goal_id);
create index idx_links_task    on public.links(task_id);

-- ============================================================
-- 3. HELPER FUNCTIONS (security definer to bypass RLS)
-- ============================================================

create or replace function public.get_my_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  return v_role;
end;
$$;

create or replace function public.get_my_team_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team uuid;
begin
  select team_id into v_team from public.users where id = auth.uid();
  return v_team;
end;
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.teams enable row level security;
create policy "teams_select" on public.teams for select using (true);
create policy "teams_insert" on public.teams for insert with check (public.get_my_role() = 'admin');
create policy "teams_update" on public.teams for update using (public.get_my_role() = 'admin');
create policy "teams_delete" on public.teams for delete using (public.get_my_role() = 'admin');

alter table public.users enable row level security;
create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (true);
create policy "users_update" on public.users for update using (id = auth.uid() or public.get_my_role() = 'admin');
create policy "users_delete" on public.users for delete using (public.get_my_role() = 'admin');

alter table public.projects enable row level security;
create policy "projects_select" on public.projects for select using (true);
create policy "projects_insert" on public.projects for insert with check (auth.uid() is not null);
create policy "projects_update" on public.projects for update using (auth.uid() is not null);
create policy "projects_delete" on public.projects for delete using (public.get_my_role() = 'admin');

alter table public.goals enable row level security;
create policy "goals_select" on public.goals for select
  using (public.get_my_role() = 'admin' or team_id is null or team_id = public.get_my_team_id());
create policy "goals_insert" on public.goals for insert with check (auth.uid() is not null);
create policy "goals_update" on public.goals for update
  using (public.get_my_role() = 'admin' or team_id is null or team_id = public.get_my_team_id());
create policy "goals_delete" on public.goals for delete
  using (public.get_my_role() = 'admin' or team_id is null or team_id = public.get_my_team_id());

alter table public.tasks enable row level security;
create policy "tasks_select" on public.tasks for select
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "tasks_insert" on public.tasks for insert with check (auth.uid() is not null);
create policy "tasks_update" on public.tasks for update
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "tasks_delete" on public.tasks for delete
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));

alter table public.kpis enable row level security;
create policy "kpis_select" on public.kpis for select
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "kpis_insert" on public.kpis for insert with check (auth.uid() is not null);
create policy "kpis_update" on public.kpis for update
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "kpis_delete" on public.kpis for delete
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.goals g where g.id = goal_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));

alter table public.links enable row level security;
create policy "links_select" on public.links for select
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.tasks t join public.goals g on g.id = t.goal_id
    where t.id = task_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "links_insert" on public.links for insert with check (auth.uid() is not null);
create policy "links_update" on public.links for update
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.tasks t join public.goals g on g.id = t.goal_id
    where t.id = task_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));
create policy "links_delete" on public.links for delete
  using (public.get_my_role() = 'admin' or exists (
    select 1 from public.tasks t join public.goals g on g.id = t.goal_id
    where t.id = task_id and (g.team_id is null or g.team_id = public.get_my_team_id())
  ));

-- ============================================================
-- 5. TRIGGER — auto-create user profile on auth signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, first_name, last_name, email, login, role, team_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'login', coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    case
      when new.raw_user_meta_data->>'team_id' is not null
           and new.raw_user_meta_data->>'team_id' <> ''
        then (new.raw_user_meta_data->>'team_id')::uuid
      else null
    end
  );
  return new;
exception
  when others then
    raise warning 'handle_new_user trigger failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. Prevent team deletion when goals reference it
-- ============================================================

create or replace function public.check_team_deletable()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.goals where team_id = old.id) then
    raise exception 'Cannot delete team: goals are still assigned to it';
  end if;
  return old;
end;
$$;

create trigger trg_check_team_deletable
  before delete on public.teams
  for each row execute function public.check_team_deletable();

-- ============================================================
-- 7. Protect seed admin from deletion / demotion
-- ============================================================

create or replace function public.protect_seed_admin()
returns trigger
language plpgsql
as $$
begin
  if old.id = '00000000-0000-0000-0000-000000000001' then
    raise exception 'Cannot delete the system admin user';
  end if;
  return old;
end;
$$;

create trigger trg_protect_seed_admin
  before delete on public.users
  for each row execute function public.protect_seed_admin();

create or replace function public.protect_seed_admin_role()
returns trigger
language plpgsql
as $$
begin
  if new.id = '00000000-0000-0000-0000-000000000001' and new.role <> 'admin' then
    raise exception 'Cannot change the system admin role';
  end if;
  return new;
end;
$$;

create trigger trg_protect_seed_admin_role
  before update on public.users
  for each row execute function public.protect_seed_admin_role();

-- ============================================================
-- 8. SEED ADMIN USER
-- ============================================================

do $$
declare
  admin_uid uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Insert into auth.users
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

  -- Insert identity record
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

  -- Ensure public.users profile exists
  if not exists (select 1 from public.users where id = admin_uid) then
    insert into public.users (id, first_name, last_name, email, login, role, team_id)
    values (admin_uid, 'System', 'Admin', 'admin@dashboard.local', 'admin', 'admin', null);
  end if;
end;
$$;

-- ============================================================
-- DONE! Login with: admin@dashboard.local / Admin123!
-- ============================================================
