-- Add status column to recurring_tasks table
ALTER TABLE public.recurring_tasks
ADD COLUMN status TEXT NOT NULL DEFAULT 'backlog';

-- Add comment explaining the column
COMMENT ON COLUMN public.recurring_tasks.status IS 'The initial status for generated tasks: backlog, todo, in-progress, review, awaiting-feedback, or done';
