-- ============================================================
-- Auto-assign RBAC Platform Superadmin role to every new user
-- Runs after the existing handle_new_user trigger that sets
-- system role = platform_admin on auth.users INSERT.
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_rbac_superadmin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform Superadmin role has a fixed UUID defined in 20260331141900_rbac_schema.sql
  INSERT INTO public.rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    NEW.id,  -- self-assigned at signup
    now()
  )
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_rbac_superadmin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_rbac_superadmin_on_signup();

-- ============================================================
-- Backfill: assign the role to any existing users who don't
-- already have it.
-- ============================================================

INSERT INTO public.rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT
  u.id,
  '00000000-0000-0000-0000-000000000001',
  u.id,
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.rbac_user_roles ur
  WHERE ur.user_id = u.id
    AND ur.role_id = '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (user_id, role_id) DO NOTHING;
