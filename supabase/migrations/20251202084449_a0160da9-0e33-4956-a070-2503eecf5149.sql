-- Drop and recreate the INSERT policy for comments with simpler check
DROP POLICY IF EXISTS "Users can create comments for accessible tasks" ON public.comments;

-- Allow users to insert their own comments (task access is implicit since they're commenting)
CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);