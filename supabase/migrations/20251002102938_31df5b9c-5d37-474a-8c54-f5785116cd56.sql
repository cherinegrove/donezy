-- Remove parent_task_id column from tasks table
ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id;