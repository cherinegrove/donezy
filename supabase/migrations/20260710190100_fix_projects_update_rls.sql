-- Phase A: projects had a leftover "any authenticated user can update" policy
-- (USING (true) WITH CHECK (true)) alongside the real owner-only one. Replace
-- both with a single policy matching the access pattern the table's own SELECT
-- policies already use: owner, collaborator, watcher, organization membership,
-- or platform/support admin.

DROP POLICY IF EXISTS "Any authenticated user can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Projects: scoped update" ON public.projects
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR auth.uid() = owner_id
  OR (auth.uid())::text = ANY (collaborator_ids)
  OR (auth.uid())::text = ANY (watcher_ids)
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = projects.organization_id
    )
  )
);
