-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "secure_message_update" ON public.messages;

-- Create new policy that allows users to update messages sent TO them (mark as read)
CREATE POLICY "secure_message_update" 
ON public.messages 
FOR UPDATE 
USING (
  auth.uid() = auth_user_id 
  OR (auth.uid())::text = to_user_id
)
WITH CHECK (
  auth.uid() = auth_user_id 
  OR (auth.uid())::text = to_user_id
);