-- Re-enable RLS on tables that might have lost it
-- These are critical for security

-- Check and enable RLS on all public tables that should have it
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled on all main tables
-- (Most tables should already have RLS enabled from previous schema)