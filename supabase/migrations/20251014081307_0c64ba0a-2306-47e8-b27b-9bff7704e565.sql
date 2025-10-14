-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;

-- Create new policies that allow all authenticated users to view and update tasks
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update all tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true);