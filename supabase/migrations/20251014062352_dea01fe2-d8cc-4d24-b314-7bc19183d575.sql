-- Add value column to task_status_definitions to store the status identifier
ALTER TABLE public.task_status_definitions
ADD COLUMN IF NOT EXISTS value TEXT;

-- Update existing records to have proper values based on their names
UPDATE public.task_status_definitions
SET value = CASE 
  WHEN LOWER(name) LIKE '%backlog%' THEN 'backlog'
  WHEN LOWER(name) LIKE '%to do%' OR LOWER(name) LIKE '%todo%' THEN 'todo'
  WHEN LOWER(name) LIKE '%in progress%' OR LOWER(name) LIKE '%in-progress%' THEN 'in-progress'
  WHEN LOWER(name) LIKE '%review%' OR LOWER(name) LIKE '%awaiting%' THEN 'review'
  WHEN LOWER(name) LIKE '%done%' OR LOWER(name) LIKE '%complete%' THEN 'done'
  ELSE LOWER(REPLACE(name, ' ', '-'))
END
WHERE value IS NULL;