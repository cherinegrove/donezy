-- The "Users can view their organizations" SELECT policy on organizations had
-- a typo: it compared user_organizations.organization_id to user_organizations.id
-- (two columns of the same row — never equal), so non-platform-admin users could
-- never read their own organization row. Fix the join to reference the
-- organizations row being filtered.

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations" ON public.organizations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.organization_id = organizations.id
      AND uo.user_id = auth.uid()
  )
);
