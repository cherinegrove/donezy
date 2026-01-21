
-- Drop and recreate the SELECT policy with proper auth_user_id matching
DROP POLICY IF EXISTS "Users can view workspace time entries" ON public.time_entries;

CREATE POLICY "Users can view workspace time entries" 
ON public.time_entries 
FOR SELECT 
USING (
  -- User can see their own entries (check both user_id and auth_user_id)
  auth.uid() = auth_user_id
  OR (auth.uid())::text = user_id
  -- Platform admins and support admins can see all
  OR has_system_role(auth.uid(), 'platform_admin')
  OR has_system_role(auth.uid(), 'support_admin')
  -- Organization members can see entries in their org
  OR (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid() AND uo.organization_id = time_entries.organization_id
  ))
  -- Project owners/collaborators/watchers can see project entries
  OR (project_id IS NOT NULL AND project_id <> '' AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = (time_entries.project_id)::uuid
    AND (
      p.auth_user_id = auth.uid()
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      OR (auth.uid())::text = ANY(p.watcher_ids)
    )
  ))
  -- Task assignees/collaborators can see task entries
  OR (task_id IS NOT NULL AND task_id <> '' AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = (time_entries.task_id)::uuid
    AND (
      t.auth_user_id = auth.uid()
      OR (auth.uid())::text = t.assignee_id
      OR (auth.uid())::text = ANY(t.collaborator_ids)
    )
  ))
);
