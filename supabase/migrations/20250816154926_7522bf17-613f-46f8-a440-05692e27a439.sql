-- Fix security issue: Restrict channel access to authorized users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can create channels" ON public.channels;
DROP POLICY IF EXISTS "Users can update their channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view channels in their projects" ON public.channels;

-- Create secure policies for channels

-- 1. Users can only view channels they are members of OR channels in projects they own
CREATE POLICY "Users can view authorized channels only" 
ON public.channels 
FOR SELECT 
USING (
  -- User is a member of this channel
  EXISTS (
    SELECT 1 
    FROM public.channel_members cm 
    WHERE cm.channel_id = channels.id 
    AND cm.user_id = auth.uid()
  )
  OR
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = channels.project_id 
    AND p.auth_user_id = auth.uid()
  )
);

-- 2. Users can only create channels in projects they own
CREATE POLICY "Users can create channels in their projects only" 
ON public.channels 
FOR INSERT 
WITH CHECK (
  -- User owns the project
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = channels.project_id 
    AND p.auth_user_id = auth.uid()
  )
  AND
  -- The created_by field must match the authenticated user
  created_by = auth.uid()
);

-- 3. Users can only update channels they created OR in projects they own
CREATE POLICY "Users can update their own channels" 
ON public.channels 
FOR UPDATE 
USING (
  -- User created this channel
  created_by = auth.uid()
  OR
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = channels.project_id 
    AND p.auth_user_id = auth.uid()
  )
);

-- 4. Users can only delete channels they created OR in projects they own
CREATE POLICY "Users can delete their own channels" 
ON public.channels 
FOR DELETE 
USING (
  -- User created this channel
  created_by = auth.uid()
  OR
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.projects p 
    WHERE p.id = channels.project_id 
    AND p.auth_user_id = auth.uid()
  )
);

-- Also ensure the channel_members policies are secure
-- Drop and recreate channel_members policies to be more restrictive

DROP POLICY IF EXISTS "Users can add channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can remove channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;

-- Users can only view members of channels they have access to
CREATE POLICY "Users can view members of authorized channels" 
ON public.channel_members 
FOR SELECT 
USING (
  -- User is a member of this channel
  EXISTS (
    SELECT 1 
    FROM public.channel_members cm2 
    WHERE cm2.channel_id = channel_members.channel_id 
    AND cm2.user_id = auth.uid()
  )
  OR
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.channels c
    JOIN public.projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);

-- Users can only add members to channels in projects they own
CREATE POLICY "Users can add members to their project channels" 
ON public.channel_members 
FOR INSERT 
WITH CHECK (
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.channels c
    JOIN public.projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);

-- Users can only remove members from channels in projects they own OR remove themselves
CREATE POLICY "Users can remove members from authorized channels" 
ON public.channel_members 
FOR DELETE 
USING (
  -- User is removing themselves
  user_id = auth.uid()
  OR
  -- User owns the project this channel belongs to
  EXISTS (
    SELECT 1 
    FROM public.channels c
    JOIN public.projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);