-- Add related_task_ids column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN related_task_ids TEXT[] DEFAULT '{}';

-- Add index for better performance when querying related tasks
CREATE INDEX idx_tasks_related_task_ids ON public.tasks USING GIN(related_task_ids);