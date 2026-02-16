
DROP POLICY "Users can view their own project template tasks" ON public.project_template_tasks;
CREATE POLICY "All authenticated users can view project template tasks"
ON public.project_template_tasks
FOR SELECT
TO authenticated
USING (true);

DROP POLICY "Users can view their own project template subtasks" ON public.project_template_subtasks;
CREATE POLICY "All authenticated users can view project template subtasks"
ON public.project_template_subtasks
FOR SELECT
TO authenticated
USING (true);
