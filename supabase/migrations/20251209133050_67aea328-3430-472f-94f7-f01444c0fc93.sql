-- Add columns to task_templates for storing actual task content
ALTER TABLE public.task_templates
ADD COLUMN IF NOT EXISTS task_title TEXT,
ADD COLUMN IF NOT EXISTS task_description TEXT,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;