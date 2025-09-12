-- Add missing status column to users table for proper user deletion
ALTER TABLE public.users 
ADD COLUMN status text DEFAULT 'active' NOT NULL;

-- Add a check constraint to ensure valid status values
ALTER TABLE public.users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive', 'deleted'));