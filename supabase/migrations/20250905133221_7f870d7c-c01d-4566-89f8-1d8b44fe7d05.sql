-- Fix the foreign key constraint issue by making video_folders.user_id cascade on delete
-- This will automatically delete video folders when a user is deleted from auth.users

-- First, drop the existing foreign key constraint
ALTER TABLE video_folders 
DROP CONSTRAINT IF EXISTS video_folders_user_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE video_folders 
ADD CONSTRAINT video_folders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also ensure that any orphaned video folders are cleaned up
DELETE FROM video_folders 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add a function to properly clean up user data when deleting users
CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up video folders (should be handled by CASCADE now)
  -- But let's be explicit for safety
  DELETE FROM video_folders WHERE user_id = OLD.id;
  
  -- Clean up shared videos
  DELETE FROM shared_videos WHERE user_id = OLD.id;
  
  -- Update the public.users table to mark as deleted instead of removing
  UPDATE public.users 
  SET status = 'deleted', updated_at = NOW()
  WHERE auth_user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to run cleanup before user deletion
DROP TRIGGER IF EXISTS cleanup_user_data_trigger ON auth.users;
CREATE TRIGGER cleanup_user_data_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_user_data();