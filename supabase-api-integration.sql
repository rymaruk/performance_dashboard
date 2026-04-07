-- ============================================================
-- API Integrations: credentials + fetched data
-- ============================================================

-- 1. Integration configs
create table if not exists api_integrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  api_token      text not null,
  api_url        text not null,
  pagination_param text default 'page',
  per_page_param   text default 'limit',
  per_page         int  default 50,
  auth_header      text default 'Authorization',
  auth_prefix      text default 'Bearer ',
  last_synced_at   timestamptz,
  created_at       timestamptz default now()
);

alter table api_integrations enable row level security;

create policy "own_integrations_select" on api_integrations
  for select using (auth.uid() = user_id);
create policy "own_integrations_insert" on api_integrations
  for insert with check (auth.uid() = user_id);
create policy "own_integrations_update" on api_integrations
  for update using (auth.uid() = user_id);
create policy "own_integrations_delete" on api_integrations
  for delete using (auth.uid() = user_id);

-- 2. Fetched records (JSONB), replaced on every sync
create table if not exists api_integration_data (
  id              uuid primary key default gen_random_uuid(),
  integration_id  uuid references api_integrations(id) on delete cascade not null,
  record_data     jsonb not null,
  created_at      timestamptz default now()
);

create index if not exists idx_aid_integration on api_integration_data(integration_id);

alter table api_integration_data enable row level security;

create policy "own_data_select" on api_integration_data
  for select using (integration_id in (select id from api_integrations where user_id = auth.uid()));
create policy "own_data_insert" on api_integration_data
  for insert with check (integration_id in (select id from api_integrations where user_id = auth.uid()));
create policy "own_data_delete" on api_integration_data
  for delete using (integration_id in (select id from api_integrations where user_id = auth.uid()));
