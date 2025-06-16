
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view channel messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Enable Row Level Security on the messages table (in case it's not already enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view messages in channels they have access to
CREATE POLICY "Users can view channel messages" 
  ON public.messages 
  FOR SELECT 
  USING (
    -- Allow if user is authenticated and the message is in a channel
    auth.uid() IS NOT NULL AND channel_id IS NOT NULL
  );

-- Create policy that allows authenticated users to insert messages
CREATE POLICY "Users can create messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is authenticated and from_user_id matches a user record
    auth.uid() IS NOT NULL AND 
    auth.uid() = auth_user_id AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = from_user_id::uuid AND auth_user_id = auth.uid()
    )
  );

-- Create policy that allows users to update their own messages
CREATE POLICY "Users can update their own messages" 
  ON public.messages 
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND 
    auth.uid() = auth_user_id
  );

-- Create policy that allows users to delete their own messages
CREATE POLICY "Users can delete their own messages" 
  ON public.messages 
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL AND 
    auth.uid() = auth_user_id
  );
