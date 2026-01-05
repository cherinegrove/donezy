-- Drop the existing restrictive DELETE policy
DROP POLICY IF EXISTS "Users can delete their own task templates" ON public.task_templates;

-- Create a new policy allowing all authenticated users to delete any task template
CREATE POLICY "All users can delete task templates"
ON public.task_templates
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Also update the UPDATE policy to allow all users to update any template
DROP POLICY IF EXISTS "Users can update their own task templates" ON public.task_templates;

CREATE POLICY "All users can update task templates"
ON public.task_templates
FOR UPDATE
USING (auth.uid() IS NOT NULL);