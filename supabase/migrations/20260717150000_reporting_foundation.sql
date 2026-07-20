-- Reporting foundation: data backfills + helpers + indexes + aggregation RPCs.
-- Aggregation runs server-side (over ALL rows) because the app only loads the
-- most recent 1000 time entries client-side, so client-side reports undercount.

-- ---------------------------------------------------------------------------
-- 1. Backfill organization_id where NULL (these rows would drop out of
--    org-scoped reports otherwise). Projects already all have an org.
-- ---------------------------------------------------------------------------

-- tasks: via their project
UPDATE public.tasks t
SET organization_id = p.organization_id
FROM public.projects p
WHERE t.organization_id IS NULL
  AND p.id = t.project_id
  AND p.organization_id IS NOT NULL;

-- time_entries: via the task's project first (authoritative), then via the
-- denormalized project_id as a fallback.
UPDATE public.time_entries te
SET organization_id = p.organization_id
FROM public.tasks t
JOIN public.projects p ON p.id = t.project_id
WHERE te.organization_id IS NULL
  AND t.id::text = te.task_id
  AND p.organization_id IS NOT NULL;

UPDATE public.time_entries te
SET organization_id = p.organization_id
FROM public.projects p
WHERE te.organization_id IS NULL
  AND te.project_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND p.id = te.project_id::uuid
  AND p.organization_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Mark terminal statuses as final so open/closed/overdue are computable.
--    Nothing in the app ever set is_final, so it was false everywhere.
-- ---------------------------------------------------------------------------
UPDATE public.project_status_definitions
SET is_final = true
WHERE lower(trim(name)) IN ('completed', 'complete', 'done', 'closed');

UPDATE public.task_status_definitions
SET is_final = true
WHERE lower(trim(coalesce(value, ''))) IN ('done', 'completed', 'closed')
   OR lower(trim(name)) IN ('done', 'completed', 'closed');

-- ---------------------------------------------------------------------------
-- 3. Helper functions (guarded casts for free-text uuid/date columns).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_uuid(p text)
RETURNS uuid LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT CASE
    WHEN p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN p::uuid END;
$$;

CREATE OR REPLACE FUNCTION public.safe_date(p text)
RETURNS date LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = '' AS $$
  SELECT CASE WHEN p ~ '^\d{4}-\d{2}-\d{2}'
              THEN substring(p from 1 for 10)::date END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Indexes for the aggregation joins/filters (none existed).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_te_org_start ON public.time_entries (organization_id, start_time) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_te_task_id ON public.time_entries (task_id);
CREATE INDEX IF NOT EXISTS idx_te_project_id ON public.time_entries (project_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_task ON public.task_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.comments (task_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON public.projects (organization_id, status);

-- ---------------------------------------------------------------------------
-- 5. Reporting RPCs. SECURITY DEFINER + org derived from the caller (never a
--    client arg) + fail-closed, because base-table RLS is inconsistent
--    (task_logs owner-only; tasks/comments USING(true)) so the function must
--    own org-scoping on every read.
-- ---------------------------------------------------------------------------

-- 5a. Hours: over time and/or grouped by user/project/client.
CREATE OR REPLACE FUNCTION public.report_hours(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text DEFAULT 'none',
  p_group_by text DEFAULT 'none',
  p_tz text DEFAULT 'UTC')
RETURNS TABLE(period timestamptz, dim_id text, dim_label text, hours numeric, entry_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_org uuid := public.get_current_user_organization();
BEGIN
  IF v_org IS NULL THEN RETURN; END IF;
  IF p_granularity NOT IN ('none','day','week','month','year')
     OR p_group_by NOT IN ('none','user','project','client') THEN
    RAISE EXCEPTION 'invalid argument';
  END IF;

  RETURN QUERY
  WITH te AS (
    SELECT t.duration, t.start_time, t.auth_user_id,
           COALESCE(
             (SELECT tk.project_id FROM public.tasks tk WHERE tk.id = public.safe_uuid(t.task_id)),
             public.safe_uuid(t.project_id)) AS project_id,
           public.safe_uuid(t.client_id) AS client_id
    FROM public.time_entries t
    WHERE t.organization_id = v_org
      AND t.end_time IS NOT NULL
      AND t.start_time >= p_start AND t.start_time < p_end
  )
  SELECT
    CASE WHEN p_granularity = 'none' THEN NULL
         ELSE (date_trunc(p_granularity, te.start_time AT TIME ZONE p_tz) AT TIME ZONE p_tz) END AS period,
    CASE p_group_by WHEN 'user' THEN te.auth_user_id::text
                    WHEN 'project' THEN te.project_id::text
                    WHEN 'client' THEN te.client_id::text END AS dim_id,
    CASE p_group_by WHEN 'user' THEN COALESCE(u.name, 'Unknown')
                    WHEN 'project' THEN COALESCE(p.name, 'No project')
                    WHEN 'client' THEN COALESCE(c.name, 'No client')
                    ELSE 'All' END AS dim_label,
    ROUND(SUM(COALESCE(te.duration, 0))::numeric / 60.0, 2) AS hours,
    COUNT(*) AS entry_count
  FROM te
  LEFT JOIN public.users u ON p_group_by = 'user' AND u.auth_user_id = te.auth_user_id
  LEFT JOIN public.projects p ON p_group_by = 'project' AND p.id = te.project_id
  LEFT JOIN public.clients c ON p_group_by = 'client' AND c.id = te.client_id
  GROUP BY 1, 2, 3
  ORDER BY 1, 4 DESC;
END $$;

-- 5b. Projects: utilization + open/closed/overdue classification + staleness.
CREATE OR REPLACE FUNCTION public.report_projects(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_stale_days int DEFAULT 14)
RETURNS TABLE(
  project_id uuid, project_name text, status text, is_final boolean,
  client_id uuid, client_name text, owner_id uuid, owner_name text,
  due_date_parsed date, is_overdue boolean,
  allocated_hours numeric, actual_hours numeric, utilization_pct numeric, remaining_hours numeric,
  last_activity timestamptz, days_since_activity int, is_stale boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_org uuid := public.get_current_user_organization();
BEGIN
  IF v_org IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH final_status AS (
    SELECT lower(trim(name)) AS name
    FROM public.project_status_definitions
    WHERE organization_id = v_org AND is_final IS TRUE
  ),
  proj AS (
    SELECT p.id, p.name, p.status, p.client_id, p.owner_id, p.created_at, p.allocated_hours,
           public.safe_date(p.due_date) AS due_parsed,
           (lower(trim(p.status)) IN (SELECT name FROM final_status)) AS is_final
    FROM public.projects p
    WHERE p.organization_id = v_org
  ),
  -- Resolve each time entry's project ONCE (task link is authoritative, denorm
  -- project_id is the fallback), then aggregate by project. Doing this per
  -- project via correlated subqueries is O(projects x entries) and times out.
  te_resolved AS (
    SELECT COALESCE(
             (SELECT tk.project_id FROM public.tasks tk WHERE tk.id = public.safe_uuid(t.task_id)),
             public.safe_uuid(t.project_id)) AS project_id,
           t.duration, t.start_time
    FROM public.time_entries t
    WHERE t.organization_id = v_org AND t.end_time IS NOT NULL
  ),
  hrs AS (
    SELECT te_resolved.project_id, SUM(te_resolved.duration)::numeric / 60.0 AS hours
    FROM te_resolved
    WHERE te_resolved.project_id IS NOT NULL
      AND (p_start IS NULL OR te_resolved.start_time >= p_start)
      AND (p_end IS NULL OR te_resolved.start_time < p_end)
    GROUP BY te_resolved.project_id
  ),
  te_activity AS (   -- last time-entry activity per project (all-time)
    SELECT te_resolved.project_id, max(te_resolved.start_time) AS last_te
    FROM te_resolved WHERE te_resolved.project_id IS NOT NULL
    GROUP BY te_resolved.project_id
  ),
  log_activity AS (  -- last task_log per project
    SELECT tk.project_id, max(l.timestamp) AS last_log
    FROM public.task_logs l
    JOIN public.tasks tk ON tk.id::text = l.task_id
    WHERE tk.organization_id = v_org
    GROUP BY tk.project_id
  ),
  comment_activity AS (  -- last comment per project
    SELECT tk.project_id, max(cm.created_at) AS last_comment
    FROM public.comments cm
    JOIN public.tasks tk ON tk.id = cm.task_id
    WHERE tk.organization_id = v_org
    GROUP BY tk.project_id
  ),
  act AS (
    SELECT proj.id AS project_id,
      GREATEST(proj.created_at, te_activity.last_te, log_activity.last_log, comment_activity.last_comment) AS last_activity
    FROM proj
    LEFT JOIN te_activity ON te_activity.project_id = proj.id
    LEFT JOIN log_activity ON log_activity.project_id = proj.id
    LEFT JOIN comment_activity ON comment_activity.project_id = proj.id
  )
  SELECT proj.id, proj.name, proj.status, proj.is_final,
    proj.client_id, c.name, proj.owner_id, ow.name,
    proj.due_parsed,
    (proj.due_parsed IS NOT NULL AND proj.due_parsed < current_date AND NOT proj.is_final) AS is_overdue,
    proj.allocated_hours::numeric,
    ROUND(COALESCE(hrs.hours, 0), 2) AS actual_hours,
    CASE WHEN proj.allocated_hours > 0 THEN ROUND(COALESCE(hrs.hours, 0) / proj.allocated_hours * 100, 1) END AS utilization_pct,
    ROUND(proj.allocated_hours - COALESCE(hrs.hours, 0), 2) AS remaining_hours,
    act.last_activity,
    (current_date - act.last_activity::date) AS days_since_activity,
    (NOT proj.is_final AND act.last_activity < now() - make_interval(days => p_stale_days)) AS is_stale
  FROM proj
  LEFT JOIN hrs ON hrs.project_id = proj.id
  LEFT JOIN act ON act.project_id = proj.id
  LEFT JOIN public.clients c ON c.id = proj.client_id
  LEFT JOIN public.users ow ON ow.auth_user_id = proj.owner_id
  ORDER BY proj.name;
END $$;

-- 5c. Tasks: grouped by stage / assignee / due-bucket, with completion rate.
CREATE OR REPLACE FUNCTION public.report_task_breakdown(
  p_group_by text DEFAULT 'stage',
  p_project_id uuid DEFAULT NULL)
RETURNS TABLE(dim_id text, dim_label text, task_count bigint, final_count bigint, completion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_org uuid := public.get_current_user_organization();
BEGIN
  IF v_org IS NULL THEN RETURN; END IF;
  IF p_group_by NOT IN ('stage','assignee','due_bucket') THEN
    RAISE EXCEPTION 'invalid argument';
  END IF;

  RETURN QUERY
  WITH final_status AS (
    SELECT value AS s FROM public.task_status_definitions
      WHERE organization_id = v_org AND is_final IS TRUE AND value IS NOT NULL
    UNION
    SELECT name FROM public.task_status_definitions
      WHERE organization_id = v_org AND is_final IS TRUE
  ),
  tk AS (
    SELECT t.status, t.assignee_id,
           (t.status IN (SELECT s FROM final_status)) AS is_final,
           public.safe_date(t.due_date) AS due_parsed
    FROM public.tasks t
    WHERE t.organization_id = v_org
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
  )
  SELECT
    CASE p_group_by
      WHEN 'stage' THEN tk.status
      WHEN 'assignee' THEN tk.assignee_id
      WHEN 'due_bucket' THEN
        CASE WHEN tk.due_parsed IS NULL THEN 'none'
             WHEN tk.due_parsed < current_date THEN 'overdue'
             WHEN tk.due_parsed = current_date THEN 'today'
             WHEN tk.due_parsed <= current_date + 7 THEN 'this_week'
             ELSE 'later' END
    END AS dim_id,
    CASE p_group_by
      WHEN 'assignee' THEN COALESCE(u.name, 'Unassigned')
      ELSE NULL END AS dim_label,
    COUNT(*) AS task_count,
    COUNT(*) FILTER (WHERE tk.is_final) AS final_count,
    ROUND(COUNT(*) FILTER (WHERE tk.is_final)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS completion_rate
  FROM tk
  LEFT JOIN public.users u ON p_group_by = 'assignee' AND u.auth_user_id::text = tk.assignee_id
  GROUP BY 1, 2
  ORDER BY 3 DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.report_hours(timestamptz, timestamptz, text, text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.report_projects(timestamptz, timestamptz, int) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.report_task_breakdown(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.report_hours(timestamptz, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_projects(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_task_breakdown(text, uuid) TO authenticated;
