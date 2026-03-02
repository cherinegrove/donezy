
CREATE OR REPLACE FUNCTION public.get_portal_data(portal_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_portal_id uuid;
  v_project_id uuid;
  v_result jsonb;
BEGIN
  SELECT id, project_id INTO v_portal_id, v_project_id
  FROM public.client_portals
  WHERE token = portal_token AND is_active = true;

  IF v_portal_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Portal not found or inactive');
  END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'status', p.status,
        'start_date', p.start_date,
        'due_date', p.due_date,
        'service_type', p.service_type,
        'allocated_hours', p.allocated_hours,
        'used_hours', p.used_hours
      )
      FROM public.projects p WHERE p.id = v_project_id
    ),
    'tasks', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority,
        'due_date', t.due_date,
        'estimated_hours', t.estimated_hours,
        'created_at', t.created_at,
        'time_spent_hours', (
          SELECT COALESCE(SUM(te2.duration) / 60.0, 0)
          FROM public.time_entries te2
          WHERE te2.task_id IS NOT NULL
            AND te2.task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND te2.task_id::uuid = t.id
        )
      ) ORDER BY t.created_at)
      FROM public.tasks t WHERE t.project_id = v_project_id
    ),
    'total_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM public.time_entries te
      JOIN public.tasks t ON t.id = te.task_id::uuid
      WHERE t.project_id = v_project_id
        AND te.task_id IS NOT NULL
        AND te.task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    'approved_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM public.time_entries te
      JOIN public.tasks t ON t.id = te.task_id::uuid
      WHERE t.project_id = v_project_id
        AND te.task_id IS NOT NULL
        AND te.task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND te.status IN ('approved', 'approved_billable', 'approved_non_billable')
    ),
    'declined_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM public.time_entries te
      JOIN public.tasks t ON t.id = te.task_id::uuid
      WHERE t.project_id = v_project_id
        AND te.task_id IS NOT NULL
        AND te.task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND te.status = 'rejected'
    ),
    'pending_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM public.time_entries te
      JOIN public.tasks t ON t.id = te.task_id::uuid
      WHERE t.project_id = v_project_id
        AND te.task_id IS NOT NULL
        AND te.task_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (te.status IS NULL OR te.status = 'pending')
    ),
    'comments', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', pc.id,
        'client_name', pc.client_name,
        'content', pc.content,
        'created_at', pc.created_at
      ) ORDER BY pc.created_at DESC)
      FROM public.portal_comments pc
      WHERE pc.portal_id = v_portal_id
    ),
    'team_members', (
      SELECT jsonb_agg(jsonb_build_object(
        'auth_user_id', u.auth_user_id,
        'name', u.name,
        'email', u.email
      ))
      FROM public.users u
      WHERE u.auth_user_id = (SELECT p2.auth_user_id FROM public.projects p2 WHERE p2.id = v_project_id LIMIT 1)
         OR (u.auth_user_id)::text = ANY(
           SELECT unnest(p3.collaborator_ids) FROM public.projects p3 WHERE p3.id = v_project_id LIMIT 1
         )
    ),
    'portal_id', v_portal_id,
    'project_id', v_project_id
  ) INTO v_result;

  RETURN v_result;
END;
$function$
