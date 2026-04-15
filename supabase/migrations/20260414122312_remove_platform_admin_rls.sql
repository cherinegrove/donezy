-- ============================================================
-- Migration: Remove platform_admin from RBAC RLS policies
-- Replace: system_roles table check → open to all authenticated
-- (Temporary: tighten with rbac_user_has_permission() in Phase 3)
-- ============================================================

-- Drop old modify policies on all RBAC tables
DROP POLICY IF EXISTS "rbac_resources_modify" ON rbac_resources;
DROP POLICY IF EXISTS "rbac_permissions_modify" ON rbac_permissions;
DROP POLICY IF EXISTS "rbac_roles_modify" ON rbac_roles;
DROP POLICY IF EXISTS "rbac_role_permissions_modify" ON rbac_role_permissions;
DROP POLICY IF EXISTS "rbac_user_roles_modify" ON rbac_user_roles;

-- Recreate policies: Allow all authenticated users to INSERT/UPDATE/DELETE
-- NOTE: SELECT is already handled by the "_select" policies in the base migration

CREATE POLICY "rbac_resources_modify" ON rbac_resources
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rbac_permissions_modify" ON rbac_permissions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rbac_roles_modify" ON rbac_roles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rbac_role_permissions_modify" ON rbac_role_permissions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "rbac_user_roles_modify" ON rbac_user_roles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
