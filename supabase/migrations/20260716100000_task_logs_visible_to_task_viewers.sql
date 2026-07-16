-- task_logs SELECT was scoped to auth.uid() = auth_user_id only, meaning users
-- could only ever see activity THEY performed — a shared task's activity log
-- looked empty/partial to everyone else. Visibility now follows the task:
-- if you can see the task (tasks' own RLS decides that), you can see its full
-- activity trail. Authors keep access to their own rows even if the task is
-- later deleted. Writes stay own-rows-only.

DROP POLICY IF EXISTS "Users can view their own task logs" ON public.task_logs;

CREATE POLICY "Users can view logs of visible tasks" ON public.task_logs
FOR SELECT TO authenticated
USING (
  auth.uid() = auth_user_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id::text = task_logs.task_id
  )
);
