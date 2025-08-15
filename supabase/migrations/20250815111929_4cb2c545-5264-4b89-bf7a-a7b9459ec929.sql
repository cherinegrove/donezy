-- Fix security vulnerability: Secure private messages and communications
-- Drop ALL existing policies on messages table to rebuild securely
DROP POLICY IF EXISTS "Managers and admins can view messages for team members" ON public.messages;
DROP POLICY IF EXISTS "System admins can view all messages across accounts" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view channel messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received or in channels th" ON public.messages;
DROP POLICY IF EXISTS "Users can view direct messages they are involved in" ON public.messages;
DROP POLICY IF EXISTS "Channel members can view channel messages" ON public.messages;
DROP POLICY IF EXISTS "Managers can view team messages within organization" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can create valid messages" ON public.messages;

-- Create secure policies from scratch

-- 1. Direct messages: Only sender and recipient can view
CREATE POLICY "secure_direct_messages_view" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  channel_id IS NULL AND (
    auth.uid()::text = from_user_id OR 
    auth.uid()::text = to_user_id
  )
);

-- 2. Channel messages: Only channel members can view
CREATE POLICY "secure_channel_messages_view" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channel_members cm 
    WHERE cm.channel_id = messages.channel_id 
    AND cm.user_id = auth.uid()
  )
);

-- 3. System admins can view all (but only authenticated system admins)
CREATE POLICY "system_admins_view_all_messages" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  has_system_role(auth.uid(), 'platform_admin'::system_role_type) OR 
  has_system_role(auth.uid(), 'support_admin'::system_role_type)
);

-- 4. Secure message creation
CREATE POLICY "secure_message_creation" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = auth_user_id AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id::text = messages.from_user_id 
    AND users.auth_user_id = auth.uid()
  )
);

-- 5. Users can update only their own messages
CREATE POLICY "secure_message_update" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = auth_user_id);

-- 6. Users can delete only their own messages
CREATE POLICY "secure_message_delete" 
ON public.messages 
FOR DELETE 
TO authenticated
USING (auth.uid() = auth_user_id);