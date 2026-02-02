-- Drop the existing restrictive comments SELECT policy
DROP POLICY IF EXISTS "Users can view comments for accessible tasks" ON public.comments;

-- Create a new policy that matches tasks visibility: all authenticated users can view all comments
CREATE POLICY "Authenticated users can view all comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);