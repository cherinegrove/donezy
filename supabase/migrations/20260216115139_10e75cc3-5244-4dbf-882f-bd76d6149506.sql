
DROP POLICY "Users can view their own project templates" ON public.project_templates;

CREATE POLICY "All authenticated users can view project templates"
ON public.project_templates
FOR SELECT
TO authenticated
USING (true);
