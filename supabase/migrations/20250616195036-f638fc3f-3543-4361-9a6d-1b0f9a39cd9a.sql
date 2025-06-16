
-- Add collaborator_ids column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN collaborator_ids text[] DEFAULT '{}';
