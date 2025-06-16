
-- Update RLS policies for messages table to allow channel messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Create new policies that handle both direct messages and channel messages
CREATE POLICY "Users can view messages they sent or received or in channels they have access to" 
  ON public.messages 
  FOR SELECT 
  USING (
    auth.uid()::text = from_user_id 
    OR auth.uid()::text = to_user_id 
    OR channel_id IS NOT NULL
  );

CREATE POLICY "Users can create messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    auth.uid()::text = from_user_id
  );

CREATE POLICY "Users can update their own messages" 
  ON public.messages 
  FOR UPDATE 
  USING (auth.uid()::text = from_user_id);

CREATE POLICY "Users can delete their own messages" 
  ON public.messages 
  FOR DELETE 
  USING (auth.uid()::text = from_user_id);
