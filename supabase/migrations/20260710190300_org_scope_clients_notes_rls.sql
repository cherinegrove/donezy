-- Phase A: clients and notes were never subject to the "true" blanket-access bug
-- (they were already scoped to owner/project-collaboration), so this is a lower-
-- urgency tidy-up rather than an urgent fix. Adds an organization-membership
-- fallback so org admins/owners can manage clients and notes across their whole
-- organization, matching the pattern already used on projects/time_entries/tasks.
-- Purely additive — existing access is preserved, only new access is granted.

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = clients.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = clients.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = notes.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.organization_id = notes.organization_id
        AND uo.role IN ('owner', 'admin')
    )
  )
);
