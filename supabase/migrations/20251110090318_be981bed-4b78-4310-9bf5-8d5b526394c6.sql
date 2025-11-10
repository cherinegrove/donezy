-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view files for accessible projects" ON project_files;

-- Create new policy that matches project visibility
-- Users can view files if they can view the project
CREATE POLICY "Users can view files for viewable projects"
ON project_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = project_files.project_id
    AND (
      -- Project owner
      p.auth_user_id = auth.uid()
      -- Collaborator
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      -- Watcher
      OR (auth.uid())::text = ANY(p.watcher_ids)
      -- Organization member
      OR EXISTS (
        SELECT 1
        FROM user_organizations uo
        WHERE uo.user_id = auth.uid()
        AND uo.organization_id = p.organization_id
      )
      -- System admin
      OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
      OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
    )
  )
);