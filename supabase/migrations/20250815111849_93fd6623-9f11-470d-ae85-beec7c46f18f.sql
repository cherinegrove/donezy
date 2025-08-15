-- Fix security vulnerability: Secure private messages and communications
-- First, let's remove any overly permissive policies and rebuild them securely

-- Drop existing policies to rebuild them more securely
DROP POLICY IF EXISTS "Users can view channel messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received or in channels th" ON public.messages;

-- Create secure policy for direct messages (only sender and recipient can view)
CREATE POLICY "Users can view direct messages they are involved in" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  -- For direct messages (no channel_id), only sender and recipient can view
  (channel_id IS NULL AND (
    auth.uid()::text = from_user_id OR 
    auth.uid()::text = to_user_id
  ))
);

-- Create secure policy for channel messages (only channel members can view)
CREATE POLICY "Channel members can view channel messages" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  -- For channel messages, user must be a member of the channel
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channel_members cm 
    WHERE cm.channel_id = messages.channel_id 
    AND cm.user_id = auth.uid()
  ))
);

-- Update the manager/admin policy to be more restrictive
DROP POLICY IF EXISTS "Managers and admins can view messages for team members" ON public.messages;

CREATE POLICY "Managers can view team messages within organization" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users with manager/admin role in same organization
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users manager_user
    WHERE manager_user.auth_user_id = auth.uid() 
    AND manager_user.role IN ('admin', 'manager')
    AND manager_user.organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users target_user
      WHERE (target_user.id::text = messages.from_user_id OR target_user.id::text = messages.to_user_id)
      AND target_user.organization_id = manager_user.organization_id
    )
  )
);

-- Ensure the create policy is secure (already looks good but let's verify)
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

CREATE POLICY "Authenticated users can create valid messages" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated and the from_user_id must match their user record
  auth.uid() IS NOT NULL AND 
  auth.uid() = auth_user_id AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id::uuid = messages.from_user_id::uuid 
    AND users.auth_user_id = auth.uid()
  )
);