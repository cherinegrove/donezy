-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view comments for accessible tasks" ON public.comments;

-- Create a new SELECT policy that also allows users to view their own comments
CREATE POLICY "Users can view comments for accessible tasks" 
ON public.comments 
FOR SELECT
USING (
  -- Users can always see their own comments
  auth.uid() = auth_user_id
  -- OR they can see comments on tasks they have access to
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = comments.task_id
    AND (
      t.auth_user_id = auth.uid()
      OR (auth.uid())::text = t.assignee_id
      OR (auth.uid())::text = ANY(t.collaborator_ids)
      OR (auth.uid())::text = ANY(t.watcher_ids)
    )
  )
  -- OR they were mentioned in the comment
  OR (auth.uid())::text = ANY(comments.mentioned_user_ids)
);