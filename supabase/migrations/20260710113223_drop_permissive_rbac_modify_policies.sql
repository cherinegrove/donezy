-- Security fix: these FOR ALL USING(true) WITH CHECK(true) policies allowed ANY
-- authenticated user to insert/update/delete RBAC roles, permissions and role
-- assignments (privilege escalation). The platform_admin-gated insert/update/delete
-- policies on each table remain in force.
DROP POLICY IF EXISTS "rbac_roles_modify" ON public.rbac_roles;
DROP POLICY IF EXISTS "rbac_permissions_modify" ON public.rbac_permissions;
DROP POLICY IF EXISTS "rbac_role_permissions_modify" ON public.rbac_role_permissions;
DROP POLICY IF EXISTS "rbac_user_roles_modify" ON public.rbac_user_roles;
