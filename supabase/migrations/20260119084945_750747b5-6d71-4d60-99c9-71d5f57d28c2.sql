-- Drop the existing restrictive SELECT policy on task_files
DROP POLICY IF EXISTS "Users can view files for accessible tasks" ON public.task_files;

-- Create a new policy that allows all authenticated users to view task files
-- This aligns with the tasks table policy where authenticated users can view all tasks
CREATE POLICY "Authenticated users can view task files"
  ON public.task_files
  FOR SELECT
  TO authenticated
  USING (true);