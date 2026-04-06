-- Add user_id column to tasks for assigning tasks to specific users
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
