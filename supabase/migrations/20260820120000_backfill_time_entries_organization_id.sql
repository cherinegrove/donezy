-- Backfill organization_id on time_entries where it's NULL
-- This ensures all time entries are visible in analytics reports

-- Set organization_id from the task's project, or from the denormalized project_id
UPDATE public.time_entries te
SET organization_id = COALESCE(
  (SELECT p.organization_id FROM public.projects p
   WHERE p.id = (SELECT tk.project_id FROM public.tasks tk WHERE tk.id = public.safe_uuid(te.task_id))),
  (SELECT p.organization_id FROM public.projects p WHERE p.id = public.safe_uuid(te.project_id))
)
WHERE te.organization_id IS NULL
  AND (
    -- Either has a task with a valid project
    (SELECT COUNT(*) FROM public.tasks tk WHERE tk.id = public.safe_uuid(te.task_id)) > 0
    OR
    -- Or has a direct project_id
    te.project_id IS NOT NULL
  );

-- Backfill from user's organization as last resort
UPDATE public.time_entries te
SET organization_id = (SELECT organization_id FROM public.users u WHERE u.id = te.user_id LIMIT 1)
WHERE te.organization_id IS NULL
  AND te.user_id IS NOT NULL;
