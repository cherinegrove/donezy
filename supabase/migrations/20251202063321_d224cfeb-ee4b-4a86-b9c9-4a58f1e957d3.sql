-- First, create a helper function to get user's workspace auth_user_id
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT auth_user_id 
  FROM time_entries 
  WHERE user_id = (_user_id)::text
  LIMIT 1;
$$;

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;

-- Create a new simplified policy with proper type casting
CREATE POLICY "Users can view workspace time entries"
ON time_entries
FOR SELECT
USING (
  -- Own entries (user who logged the time)
  (auth.uid())::text = user_id
  OR
  -- Same workspace - compare auth_user_ids
  auth_user_id = public.get_user_workspace_id(auth.uid())
  OR
  -- Same organization
  (
    organization_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
      AND uo.organization_id = time_entries.organization_id
    )
  )
  OR
  -- Accessible projects (cast text to uuid for comparison)
  (
    project_id IS NOT NULL 
    AND project_id != ''
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = time_entries.project_id::uuid
      AND (
        p.auth_user_id = auth.uid()
        OR (auth.uid())::text = ANY(p.collaborator_ids)
        OR (auth.uid())::text = ANY(p.watcher_ids)
      )
    )
  )
  OR
  -- Accessible tasks (cast text to uuid for comparison)
  (
    task_id IS NOT NULL 
    AND task_id != ''
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = time_entries.task_id::uuid
      AND (
        t.auth_user_id = auth.uid()
        OR (auth.uid())::text = t.assignee_id
        OR (auth.uid())::text = ANY(t.collaborator_ids)
      )
    )
  )
  OR
  -- System admins
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR
  has_system_role(auth.uid(), 'support_admin'::system_role_type)
);