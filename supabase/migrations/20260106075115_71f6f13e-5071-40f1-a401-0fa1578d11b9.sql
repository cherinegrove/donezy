-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;

-- Create a new UPDATE policy that allows:
-- 1. Users to update their own time entries
-- 2. Platform admins to update any time entries
-- 3. Support admins to update any time entries
-- 4. Org admins/owners to update time entries in their organization
-- 5. Project owners to update time entries for their projects
CREATE POLICY "Users can update time entries"
ON public.time_entries
FOR UPDATE
USING (
  -- User owns the time entry
  (auth.uid() = auth_user_id)
  OR
  -- Platform admin can update any
  has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR
  -- Support admin can update any
  has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR
  -- Users in the same organization can update (for managers)
  (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = time_entries.organization_id
    AND (uo.role = 'admin' OR uo.role = 'owner')
  ))
  OR
  -- Project owner/collaborator can update time entries for their projects
  (project_id IS NOT NULL AND project_id <> '' AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = time_entries.project_id::uuid
    AND (p.auth_user_id = auth.uid() OR p.owner_id = auth.uid())
  ))
);