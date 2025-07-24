-- Add tags column to project_notes table
ALTER TABLE public.project_notes 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create an index for better tag search performance
CREATE INDEX idx_project_notes_tags ON public.project_notes USING GIN(tags);