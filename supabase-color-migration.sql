-- ============================================================
-- Color Migration: add accent color column to entities
-- Run this in Supabase SQL Editor AFTER the main schema + KPI migration.
-- ============================================================

alter table public.projects       add column if not exists color text default null;
alter table public.teams          add column if not exists color text default null;
alter table public.users          add column if not exists color text default null;
alter table public.goals          add column if not exists color text default null;
alter table public.tasks          add column if not exists color text default null;
alter table public.kpi_definitions add column if not exists color text default null;
alter table public.goal_kpis      add column if not exists color text default null;
