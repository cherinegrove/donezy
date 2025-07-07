-- Add form_fields column to task_templates table
ALTER TABLE public.task_templates 
ADD COLUMN form_fields JSONB DEFAULT '[]'::jsonb;