-- Non-admin users could not see any teammates (empty assignee dropdowns,
-- reported when Brandon was moved to Regular User). Root cause: the users
-- SELECT policy's org branch reads the LEGACY users.organization_id column,
-- which is NULL for every user — the real membership lives in
-- user_organizations. Everyone appeared fine only because everyone held the
-- platform_admin bypass.
--
-- Fix: (1) backfill the legacy column from real membership (other code reads
-- it via get_current_user_organization()), and (2) base the visibility policy
-- on real membership via a SECURITY DEFINER helper — a plain join in the
-- policy would silently fail because user_organizations RLS only lets
-- non-admins see their own membership rows.

UPDATE public.users u
SET organization_id = uo.organization_id
FROM public.user_organizations uo
WHERE uo.user_id = u.auth_user_id
  AND u.organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.shares_organization_with(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organizations a
    JOIN public.user_organizations b ON a.organization_id = b.organization_id
    WHERE a.user_id = _viewer AND b.user_id = _target
  );
$$;

DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;

CREATE POLICY "Users can view users in their organization" ON public.users
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.shares_organization_with(auth.uid(), users.auth_user_id)
  OR has_system_role(auth.uid(), 'platform_admin'::system_role_type)
  OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
);
