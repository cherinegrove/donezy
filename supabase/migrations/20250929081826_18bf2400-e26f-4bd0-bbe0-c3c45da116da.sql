-- Update the RLS policy for projects to allow users to see projects they own or are collaborators on
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view projects they own or collaborate on" 
ON public.projects 
FOR SELECT 
USING (
  auth.uid() = auth_user_id OR 
  auth.uid()::text = ANY(collaborator_ids)
);