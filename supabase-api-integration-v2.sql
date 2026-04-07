-- Add project_id to api_integrations for per-project scoping
ALTER TABLE api_integrations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

-- Update RLS policies to include project_id
-- (existing policies filter by user_id, which is fine for admin access)
