-- Allow users to view clients for projects they can access
CREATE POLICY "Users can view clients for accessible projects" 
ON public.clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.client_id = clients.id 
    AND (
      p.auth_user_id = auth.uid() 
      OR (auth.uid())::text = ANY(p.collaborator_ids)
      OR (auth.uid())::text = ANY(p.watcher_ids)
    )
  )
);