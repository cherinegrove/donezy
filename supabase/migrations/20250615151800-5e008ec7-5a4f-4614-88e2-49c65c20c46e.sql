
-- Add missing columns to task_templates table to match the component expectations
ALTER TABLE public.task_templates 
ADD COLUMN IF NOT EXISTS default_priority TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS default_status TEXT NOT NULL DEFAULT 'todo',
ADD COLUMN IF NOT EXISTS include_custom_fields TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS field_order TEXT[] DEFAULT '{}';

-- Remove conflicting columns that are not needed for task templates
ALTER TABLE public.task_templates 
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS estimated_hours;
