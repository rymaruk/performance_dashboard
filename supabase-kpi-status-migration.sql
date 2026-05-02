-- Migration: Add status column to goal_kpis
-- Run this script in the Supabase SQL editor.

alter table public.goal_kpis
  add column if not exists status text not null default 'В процесі';
