-- Update the direct messages RLS policy to allow system notifications
DROP POLICY IF EXISTS "secure_direct_messages_view" ON public.messages;

CREATE POLICY "secure_direct_messages_view" 
ON public.messages 
FOR SELECT 
USING (
  (channel_id IS NULL) AND (
    ((auth.uid())::text = from_user_id) OR 
    ((auth.uid())::text = to_user_id) OR
    (from_user_id = 'system')  -- Allow system messages
  )
);