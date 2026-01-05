-- Create policy to allow all authenticated users to view task templates
CREATE POLICY "All users can view task templates" 
ON public.task_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);