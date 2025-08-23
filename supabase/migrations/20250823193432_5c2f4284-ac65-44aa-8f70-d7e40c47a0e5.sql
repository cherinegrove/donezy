-- Drop the constraint that doesn't allow multiple NULL values
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_unique;

-- Verify our partial unique index remains to handle uniqueness properly
-- This allows multiple NULL auth_user_id values but ensures uniqueness for non-NULL values