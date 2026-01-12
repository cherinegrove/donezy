-- Add reviewed_at column to time_entries for tracking reviewed suspicious timers
ALTER TABLE public.time_entries 
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add reviewed_by column to track who reviewed it
ALTER TABLE public.time_entries 
ADD COLUMN reviewed_by TEXT DEFAULT NULL;