-- New reporting functions for task analytics

-- Get overdue tasks by assignee
CREATE OR REPLACE FUNCTION public.report_overdue_tasks_by_assignee()
RETURNS TABLE (
  assignee_id TEXT,
  assignee_name TEXT,
  task_count BIGINT,
  avg_days_overdue NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    u.id as assignee_id,
    u.name as assignee_name,
    COUNT(DISTINCT t.id)::BIGINT as task_count,
    ROUND(AVG(EXTRACT(DAY FROM (now() - t.due_date)))::NUMERIC, 1) as avg_days_overdue
  FROM public.tasks t
  LEFT JOIN public.users u ON t.assignee_id = u.id
  WHERE t.due_date < now()
    AND t.status != 'done'
  GROUP BY u.id, u.name
  ORDER BY task_count DESC;
$$;

-- Get due date reschedules by assignee
CREATE OR REPLACE FUNCTION public.report_due_date_reschedules_by_assignee()
RETURNS TABLE (
  assignee_id TEXT,
  assignee_name TEXT,
  reschedule_count BIGINT,
  avg_days_moved NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    u.id as assignee_id,
    u.name as assignee_name,
    COUNT(DISTINCT tl.task_id)::BIGINT as reschedule_count,
    ROUND(AVG(
      ABS(EXTRACT(DAY FROM (
        (tl.details->>'new_due_date')::TIMESTAMP -
        (tl.details->>'old_due_date')::TIMESTAMP
      )))
    )::NUMERIC, 1) as avg_days_moved
  FROM public.task_logs tl
  LEFT JOIN public.users u ON tl.user_id = u.id
  LEFT JOIN public.tasks t ON t.id = tl.task_id::uuid
  WHERE tl.action = 'due_date_changed'
    AND tl.details->>'new_due_date' IS NOT NULL
    AND tl.details->>'old_due_date' IS NOT NULL
  GROUP BY u.id, u.name
  ORDER BY reschedule_count DESC;
$$;

-- Get due date reschedules by project
CREATE OR REPLACE FUNCTION public.report_due_date_reschedules_by_project()
RETURNS TABLE (
  project_id TEXT,
  project_name TEXT,
  reschedule_count BIGINT,
  avg_days_moved NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT tl.task_id)::BIGINT as reschedule_count,
    ROUND(AVG(
      ABS(EXTRACT(DAY FROM (
        (tl.details->>'new_due_date')::TIMESTAMP -
        (tl.details->>'old_due_date')::TIMESTAMP
      )))
    )::NUMERIC, 1) as avg_days_moved
  FROM public.task_logs tl
  LEFT JOIN public.tasks t ON t.id = tl.task_id::uuid
  LEFT JOIN public.projects p ON t.project_id = p.id
  WHERE tl.action = 'due_date_changed'
    AND tl.details->>'new_due_date' IS NOT NULL
    AND tl.details->>'old_due_date' IS NOT NULL
  GROUP BY p.id, p.name
  ORDER BY reschedule_count DESC;
$$;

-- Get due date reschedules by client
CREATE OR REPLACE FUNCTION public.report_due_date_reschedules_by_client()
RETURNS TABLE (
  client_id TEXT,
  client_name TEXT,
  reschedule_count BIGINT,
  avg_days_moved NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    c.id as client_id,
    c.name as client_name,
    COUNT(DISTINCT tl.task_id)::BIGINT as reschedule_count,
    ROUND(AVG(
      ABS(EXTRACT(DAY FROM (
        (tl.details->>'new_due_date')::TIMESTAMP -
        (tl.details->>'old_due_date')::TIMESTAMP
      )))
    )::NUMERIC, 1) as avg_days_moved
  FROM public.task_logs tl
  LEFT JOIN public.tasks t ON t.id = tl.task_id::uuid
  LEFT JOIN public.projects p ON t.project_id = p.id
  LEFT JOIN public.clients c ON p.client_id = c.id
  WHERE tl.action = 'due_date_changed'
    AND tl.details->>'new_due_date' IS NOT NULL
    AND tl.details->>'old_due_date' IS NOT NULL
  GROUP BY c.id, c.name
  ORDER BY reschedule_count DESC;
$$;
