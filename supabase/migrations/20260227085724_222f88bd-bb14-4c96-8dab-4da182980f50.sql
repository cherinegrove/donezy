
-- Create client_portals table
CREATE TABLE public.client_portals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create portal_comments table
CREATE TABLE public.portal_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_comments ENABLE ROW LEVEL SECURITY;

-- client_portals policies: only project owners can manage
CREATE POLICY "Project owners can manage their portals"
  ON public.client_portals
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- portal_comments: anyone can insert (public), owners can view
CREATE POLICY "Anyone can insert portal comments"
  ON public.portal_comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Portal owners can view comments"
  ON public.portal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_portals cp
    WHERE cp.id = portal_comments.portal_id
    AND cp.created_by = auth.uid()
  ));

-- Security definer function for public portal data access (no auth required)
CREATE OR REPLACE FUNCTION public.get_portal_data(portal_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal_id uuid;
  v_project_id uuid;
  v_result jsonb;
BEGIN
  -- Find active portal by token
  SELECT id, project_id INTO v_portal_id, v_project_id
  FROM public.client_portals
  WHERE token = portal_token AND is_active = true;

  IF v_portal_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Portal not found or inactive');
  END IF;

  -- Build response
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
        'estimated_hours', t.estimated_hours
      ) ORDER BY t.created_at)
      FROM public.tasks t WHERE t.project_id = v_project_id
    ),
    'total_hours', (
      SELECT COALESCE(SUM(te.duration) / 60.0, 0)
      FROM public.time_entries te
      JOIN public.tasks t ON te.task_id = t.id
      WHERE t.project_id = v_project_id AND te.end_time IS NOT NULL
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
    'portal_id', v_portal_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_client_portals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_client_portals_updated_at
  BEFORE UPDATE ON public.client_portals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_portals_updated_at();
