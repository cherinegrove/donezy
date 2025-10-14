-- Allow all authenticated users to delete tasks
CREATE POLICY "Authenticated users can delete all tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);