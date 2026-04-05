-- ============================================================
-- KPI Migration: kpi_definitions + goal_kpis junction table
-- Run this in Supabase SQL Editor AFTER the main schema.
-- ============================================================

-- 1. Master KPI definitions table
create table if not exists public.kpi_definitions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  unit        text not null default '%',
  target_value numeric not null default 100,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_kpi_definitions_name
  on public.kpi_definitions(name);

-- 2. Junction: goal <-> kpi_definition (many-to-many, unique per goal)
create table if not exists public.goal_kpis (
  id              uuid primary key default gen_random_uuid(),
  goal_id         uuid not null references public.goals(id) on delete cascade,
  kpi_definition_id uuid not null references public.kpi_definitions(id) on delete cascade,
  current_value   numeric not null default 0,
  target_value    numeric not null default 100,
  created_at      timestamptz not null default now(),
  unique(goal_id, kpi_definition_id)
);

create index if not exists idx_goal_kpis_goal on public.goal_kpis(goal_id);
create index if not exists idx_goal_kpis_kpi  on public.goal_kpis(kpi_definition_id);

-- 3. Migrate existing kpis data into new structure
-- Insert unique KPI names into kpi_definitions
insert into public.kpi_definitions (name, unit, target_value)
select distinct on (name) name, unit, target_value
from public.kpis
where name <> ''
on conflict (name) do nothing;

-- Migrate existing kpis rows into goal_kpis junction
insert into public.goal_kpis (goal_id, kpi_definition_id, current_value, target_value)
select k.goal_id, kd.id, k.current_value, k.target_value
from public.kpis k
join public.kpi_definitions kd on kd.name = k.name
on conflict (goal_id, kpi_definition_id) do nothing;

-- 4. RLS for kpi_definitions (everyone can read, admin can write)
alter table public.kpi_definitions enable row level security;

create policy "kpi_defs_select" on public.kpi_definitions for select
  using (true);

create policy "kpi_defs_insert" on public.kpi_definitions for insert
  with check (public.get_my_role() = 'admin');

create policy "kpi_defs_update" on public.kpi_definitions for update
  using (public.get_my_role() = 'admin');

create policy "kpi_defs_delete" on public.kpi_definitions for delete
  using (public.get_my_role() = 'admin');

-- 5. RLS for goal_kpis (same as kpis — based on goal's team)
alter table public.goal_kpis enable row level security;

create policy "goal_kpis_select" on public.goal_kpis for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "goal_kpis_insert" on public.goal_kpis for insert
  with check (auth.uid() is not null);

create policy "goal_kpis_update" on public.goal_kpis for update
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "goal_kpis_delete" on public.goal_kpis for delete
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goals g
      where g.id = goal_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

-- 6. Prevent deleting a kpi_definition that is still in use
create or replace function public.check_kpi_def_deletable()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.goal_kpis where kpi_definition_id = old.id) then
    raise exception 'Cannot delete KPI definition: it is still assigned to goals';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_check_kpi_def_deletable on public.kpi_definitions;
create trigger trg_check_kpi_def_deletable
  before delete on public.kpi_definitions
  for each row execute function public.check_kpi_def_deletable();
