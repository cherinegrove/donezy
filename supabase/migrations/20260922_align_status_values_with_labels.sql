-- Migration: Align database status values with frontend labels
-- This migration updates status values to match their display labels
-- Changes: todo→new, awaiting-feedback-(internal)→awaiting-int
-- This is REVERSIBLE - see rollback section at bottom

BEGIN;

-- Step 1: Update task_status_definitions to use matching values
UPDATE public.task_status_definitions
SET value = 'new'
WHERE value = 'todo' AND name = 'New';

UPDATE public.task_status_definitions
SET value = 'awaiting-int'
WHERE value = 'awaiting-feedback-(internal)' AND name = 'Awaiting Int';

-- Step 2: Update all tasks with the old values to the new values
UPDATE public.tasks
SET status = 'new'
WHERE status = 'todo';

UPDATE public.tasks
SET status = 'awaiting-int'
WHERE status = 'awaiting-feedback-(internal)';

-- Verify the changes
SELECT COUNT(*) as tasks_with_new_status FROM public.tasks WHERE status = 'new';
SELECT COUNT(*) as tasks_with_awaiting_int FROM public.tasks WHERE status = 'awaiting-int';

COMMIT;

-- ROLLBACK (if needed, run this):
-- BEGIN;
-- UPDATE public.task_status_definitions SET value = 'todo' WHERE value = 'new' AND name = 'New';
-- UPDATE public.task_status_definitions SET value = 'awaiting-feedback-(internal)' WHERE value = 'awaiting-int' AND name = 'Awaiting Int';
-- UPDATE public.tasks SET status = 'todo' WHERE status = 'new';
-- UPDATE public.tasks SET status = 'awaiting-feedback-(internal)' WHERE status = 'awaiting-int';
-- COMMIT;
