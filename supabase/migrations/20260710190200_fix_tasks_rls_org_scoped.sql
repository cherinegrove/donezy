-- Phase A: tasks currently has RLS policies with USING (true) for SELECT, UPDATE,
-- and DELETE — meaning any authenticated user can view, edit, or delete every task
-- in the entire database, regardless of who created it or what organization they
-- belong to. This is invisible today because every real user is on the same team,
-- but is a critical cross-tenant data leak the moment a second organization exists.
--
-- Unlike projects/time_entries, tasks has no non-blanket fallback policy today —
-- dropping the "true" policies alone would break visibility for every assignee/
-- collaborator/watcher who isn't the task's own creator. So this migration adds
-- the real scoped policies and drops the dangerous ones in the same transaction;
-- it must never be split across two deploys.

DROP POLICY IF EXISTS "Authenticated users can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "System admins can view all tasks across accounts" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Tasks: scoped select" ON public.tasks
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (auth.uid())::text = assignee_id
  OR (auth.uid())::text = ANY (collaborator_ids)
  OR (auth.uid())::text = ANY (watcher_ids)
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = tasks.organization_id
    )
  )
  OR (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (
          p.auth_user_id = auth.uid()
          OR p.owner_id = auth.uid()
          OR (auth.uid())::text = ANY (p.collaborator_ids)
          OR (auth.uid())::text = ANY (p.watcher_ids)
        )
    )
  )
);

CREATE POLICY "Tasks: scoped update" ON public.tasks
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (auth.uid())::text = assignee_id
  OR (auth.uid())::text = ANY (collaborator_ids)
  OR (auth.uid())::text = ANY (watcher_ids)
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = tasks.organization_id
    )
  )
  OR (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (
          p.auth_user_id = auth.uid()
          OR p.owner_id = auth.uid()
          OR (auth.uid())::text = ANY (p.collaborator_ids)
          OR (auth.uid())::text = ANY (p.watcher_ids)
        )
    )
  )
);

CREATE POLICY "Tasks: scoped delete" ON public.tasks
FOR DELETE
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (auth.uid())::text = assignee_id
  OR (auth.uid())::text = ANY (collaborator_ids)
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = tasks.organization_id
    )
  )
  OR (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (p.auth_user_id = auth.uid() OR p.owner_id = auth.uid())
    )
  )
);
