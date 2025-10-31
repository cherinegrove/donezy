-- Update project_notes policies to allow viewing notes for accessible projects
DROP POLICY IF EXISTS "Users can view their own project notes" ON public.project_notes;

CREATE POLICY "Users can view notes for accessible projects"
ON public.project_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_notes.project_id 
    AND (
      p.auth_user_id = auth.uid() 
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      OR (auth.uid())::text = ANY(p.watcher_ids)
    )
  )
);

-- Update project_folders policies to allow viewing folders for accessible projects
DROP POLICY IF EXISTS "Users can view their own project folders" ON public.project_folders;

CREATE POLICY "Users can view folders for accessible projects"
ON public.project_folders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_folders.project_id 
    AND (
      p.auth_user_id = auth.uid() 
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      OR (auth.uid())::text = ANY(p.watcher_ids)
    )
  )
);