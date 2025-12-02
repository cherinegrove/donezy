-- Add RLS policy to allow any authenticated user to update projects (for Google Chat settings)
CREATE POLICY "Any authenticated user can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);