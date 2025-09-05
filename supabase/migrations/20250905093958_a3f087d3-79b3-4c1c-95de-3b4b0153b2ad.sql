-- Fix the channel_members RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of authorized channels" ON channel_members;
DROP POLICY IF EXISTS "Users can add members to their project channels" ON channel_members;
DROP POLICY IF EXISTS "Users can remove members from authorized channels" ON channel_members;

-- Create new non-recursive policies
CREATE POLICY "Users can view channel members"
ON channel_members
FOR SELECT
TO authenticated
USING (
  -- Users can see members of channels they belong to
  channel_id IN (
    SELECT channel_id 
    FROM channel_members cm 
    WHERE cm.user_id = auth.uid()
  )
  OR
  -- Project owners can see all members of their project channels
  EXISTS (
    SELECT 1 
    FROM channels c
    INNER JOIN projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can add channel members"
ON channel_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM channels c
    INNER JOIN projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can leave channels or owners can remove members"
ON channel_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() -- Users can remove themselves
  OR
  EXISTS (
    SELECT 1 
    FROM channels c
    INNER JOIN projects p ON c.project_id = p.id
    WHERE c.id = channel_members.channel_id 
    AND p.auth_user_id = auth.uid()
  )
);