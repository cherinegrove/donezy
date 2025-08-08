-- Add color column to teams table
ALTER TABLE public.teams 
ADD COLUMN color text DEFAULT '#3b82f6';

-- Add color column to custom_roles table  
ALTER TABLE public.custom_roles
ADD COLUMN color text DEFAULT '#10b981';