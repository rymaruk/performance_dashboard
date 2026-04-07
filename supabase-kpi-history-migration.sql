-- ============================================================
-- KPI Value History: audit trail for current_value changes
-- Run this in Supabase SQL Editor AFTER the KPI migration.
-- ============================================================

create table if not exists public.kpi_value_history (
  id          uuid primary key default gen_random_uuid(),
  goal_kpi_id uuid not null references public.goal_kpis(id) on delete cascade,
  old_value   numeric not null,
  new_value   numeric not null,
  comment     text not null default '',
  user_id     uuid references auth.users(id),
  user_name   text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_kpi_history_goal_kpi
  on public.kpi_value_history(goal_kpi_id);

-- RLS
alter table public.kpi_value_history enable row level security;

create policy "kpi_history_select" on public.kpi_value_history for select
  using (
    public.get_my_role() = 'admin'
    or exists (
      select 1 from public.goal_kpis gk
      join public.goals g on g.id = gk.goal_id
      where gk.id = goal_kpi_id
        and (g.team_id is null or g.team_id = public.get_my_team_id())
    )
  );

create policy "kpi_history_insert" on public.kpi_value_history for insert
  with check (auth.uid() is not null);
