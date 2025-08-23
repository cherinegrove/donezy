-- Remove the problematic unique constraint that doesn't allow multiple NULL values
DROP INDEX IF EXISTS public.users_auth_user_id_unique;

-- Verify our partial unique index is working
-- This allows multiple NULL auth_user_id values but ensures uniqueness for non-NULL values