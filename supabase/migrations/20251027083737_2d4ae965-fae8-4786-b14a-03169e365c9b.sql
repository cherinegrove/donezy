-- Drop the old restrictive policy for viewing project files
DROP POLICY IF EXISTS "Users can view their own project files" ON public.project_files;

-- Create new policy allowing users to view files for projects they have access to
CREATE POLICY "Users can view files for accessible projects"
ON public.project_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_files.project_id 
    AND (
      p.auth_user_id = auth.uid() 
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      OR (auth.uid())::text = ANY(p.watcher_ids)
    )
  )
);