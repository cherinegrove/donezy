-- Fix the infinite recursion in messages policy with proper type casting
-- Drop and recreate the problematic policies to fix the circular dependency

-- First, let's check and fix the messages table policies
DROP POLICY IF EXISTS "users_can_view_their_messages" ON public.messages;

-- Create a simpler, non-recursive policy for messages with proper UUID type casting
CREATE POLICY "users_can_view_their_messages" 
ON public.messages 
FOR SELECT 
USING (
  (auth.uid())::text = to_user_id 
  OR (auth.uid())::text = from_user_id 
  OR from_user_id = 'system'
);

-- Also ensure the messages table has the right structure and RLS enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;