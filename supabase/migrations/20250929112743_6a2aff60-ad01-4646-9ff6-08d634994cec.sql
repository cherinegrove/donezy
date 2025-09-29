-- Update comments RLS policies to allow visibility for all task participants
DROP POLICY IF EXISTS "Users can view comments for their tasks" ON public.comments;

-- Create new policy that allows viewing comments for:
-- 1. Task owners
-- 2. Task assignees 
-- 3. Task collaborators
-- 4. People mentioned in comments
CREATE POLICY "Users can view comments for accessible tasks" ON public.comments
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = comments.task_id 
    AND (
      -- Task owner
      t.auth_user_id = auth.uid() 
      -- Task assignee
      OR (auth.uid())::text = t.assignee_id
      -- Task collaborator
      OR (auth.uid())::text = ANY(t.collaborator_ids)
      -- Person mentioned in this comment
      OR (auth.uid())::text = ANY(comments.mentioned_user_ids)
    )
  )
);

-- Update insert policy to allow comments from task participants, not just owners
DROP POLICY IF EXISTS "Users can create comments for their tasks" ON public.comments;

CREATE POLICY "Users can create comments for accessible tasks" ON public.comments
FOR INSERT 
WITH CHECK (
  auth.uid() = auth_user_id 
  AND EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.id = comments.task_id 
    AND (
      -- Task owner
      t.auth_user_id = auth.uid() 
      -- Task assignee
      OR (auth.uid())::text = t.assignee_id
      -- Task collaborator  
      OR (auth.uid())::text = ANY(t.collaborator_ids)
    )
  )
);