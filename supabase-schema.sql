-- ============================================================
-- Performance Dashboard — Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor (one shot).
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Teams
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'active'
               check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- User profiles (linked to auth.users via id)
create table if not exists public.users (
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

-- Projects
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Новий проект',
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- Goals
create table if not exists public.goals (
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

-- Tasks
create table if not exists public.tasks (
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

-- KPIs
create table if not exists public.kpis (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals(id) on delete cascade,
  name          text not null default '',
  current_value numeric not null default 0,
  target_value  numeric not null default 100,
  unit          text not null default '%'
);

-- Links (attached to tasks)
create table if not exists public.links (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label   text not null default '',
  url     text not null default ''
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_users_team    on public.users(team_id);
create index if not exists idx_goals_project on public.goals(project_id);
create index if not exists idx_goals_team    on public.goals(team_id);
create index if not exists idx_tasks_goal    on public.tasks(goal_id);
create index if not exists idx_kpis_goal     on public.kpis(goal_id);
create index if not exists idx_links_task    on public.links(task_id);

-- ============================================================
-- 3. HELPER FUNCTIONS — get current user's role / team
--    SECURITY DEFINER + search_path = public to bypass RLS
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

-- ---- teams ----
alter table public.teams enable row level security;

create policy "teams_select" on public.teams for select
  using (true);

create policy "teams_insert" on public.teams for insert
  with check (public.get_my_role() = 'admin');

create policy "teams_update" on public.teams for update
  using (public.get_my_role() = 'admin');

create policy "teams_delete" on public.teams for delete
  using (public.get_my_role() = 'admin');

-- ---- users ----
alter table public.users enable row level security;

create policy "users_select" on public.users for select
  using (true);

create policy "users_insert" on public.users for insert
  with check (true);

create policy "users_update" on public.users for update
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "users_delete" on public.users for delete
  using (public.get_my_role() = 'admin');

-- ---- projects ----
alter table public.projects enable row level security;

create policy "projects_select" on public.projects for select
  using (true);

create policy "projects_insert" on public.projects for insert
  with check (auth.uid() is not null);

create policy "projects_update" on public.projects for update
  using (auth.uid() is not null);

create policy "projects_delete" on public.projects for delete
  using (public.get_my_role() = 'admin');

-- ---- goals ----
alter table public.goals enable row level security;

create policy "goals_select" on public.goals for select
  using (
    public.get_my_role() = 'admin'
    or team_id is null
    or team_id = public.get_my_team_id()
  );

create policy "goals_insert" on public.goals for insert
  with check (auth.uid() is not null);

create policy "goals_update" on public.goals for update
  using (
    public.get_my_role() = 'admin'
    or team_id is null
    or team_id = public.get_my_team_id()
  );

create policy "goals_delete" on public.goals for delete
  using (
    public.get_my_role() = 'admin'
    or team_id is null
    or team_id = public.get_my_team_id()
  );

-- ---- tasks ----
alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "tasks_insert" on public.tasks for insert
  with check (auth.uid() is not null);

create policy "tasks_update" on public.tasks for update
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "tasks_delete" on public.tasks for delete
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

-- ---- kpis ----
alter table public.kpis enable row level security;

create policy "kpis_select" on public.kpis for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "kpis_insert" on public.kpis for insert
  with check (auth.uid() is not null);

create policy "kpis_update" on public.kpis for update
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "kpis_delete" on public.kpis for delete
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

-- ---- links ----
alter table public.links enable row level security;

create policy "links_select" on public.links for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.tasks t
      join public.goals g on g.id = t.goal_id
      where t.id = task_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "links_insert" on public.links for insert
  with check (auth.uid() is not null);

create policy "links_update" on public.links for update
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.tasks t
      join public.goals g on g.id = t.goal_id
      where t.id = task_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "links_delete" on public.links for delete
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.tasks t
      join public.goals g on g.id = t.goal_id
      where t.id = task_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

-- ============================================================
-- 5. TRIGGER — auto-create user profile row on auth signup
--    Uses exception handling so a trigger failure doesn't
--    break the auth signup flow.
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
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. FUNCTION — prevent team deletion when goals reference it
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

drop trigger if exists trg_check_team_deletable on public.teams;
create trigger trg_check_team_deletable
  before delete on public.teams
  for each row execute function public.check_team_deletable();

-- ============================================================
-- 7. PROTECT SEED ADMIN — cannot be deleted or demoted
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

drop trigger if exists trg_protect_seed_admin on public.users;
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

drop trigger if exists trg_protect_seed_admin_role on public.users;
create trigger trg_protect_seed_admin_role
  before update on public.users
  for each row execute function public.protect_seed_admin_role();

-- ============================================================
-- NEXT STEP: Run supabase-seed-admin.sql to create the admin user
-- ============================================================
