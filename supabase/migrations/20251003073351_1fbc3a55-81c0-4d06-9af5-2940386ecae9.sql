-- Add checklist column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;