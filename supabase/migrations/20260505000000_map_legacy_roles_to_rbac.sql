-- ============================================================
-- Map legacy system roles to RBAC roles
--
-- For each user in auth.users:
--   - has system role platform_admin → UUID 001 (Platform Superadmin)
--   - has system role support_admin  → UUID 004 (Support Admin)
--   - has no system role             → UUID 001 (Platform Superadmin, default)
-- ============================================================

-- Step 1: Create Support Admin RBAC role
INSERT INTO public.rbac_roles (id, name, description, is_system, organization_id)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Support Admin',
  'Support team: global viewer with time entry management',
  true,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Assign permissions to Support Admin
INSERT INTO public.rbac_role_permissions (role_id, permission_id, scope)
SELECT '00000000-0000-0000-0000-000000000004', id, 'all'
FROM public.rbac_permissions
WHERE name IN (
  'users:view', 'users:edit',
  'projects:view',
  'tasks:view', 'tasks:edit',
  'time_entries:view', 'time_entries:manage',
  'clients:view', 'messages:view',
  'analytics:view', 'dashboards:view', 'teams:view'
)
ON CONFLICT DO NOTHING;

-- Step 3: Loop every auth user, assign RBAC based on system role
DO $$
DECLARE
  rec RECORD;
  sys_role TEXT;
  rbac_role_id UUID;
BEGIN
  FOR rec IN SELECT id FROM auth.users LOOP
    -- Get system role name (if any)
    SELECT sr.name::TEXT INTO sys_role
    FROM public.user_system_roles usr
    JOIN public.system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = rec.id
    LIMIT 1;

    -- Determine RBAC role
    IF sys_role = 'support_admin' THEN
      rbac_role_id := '00000000-0000-0000-0000-000000000004';
    ELSE
      -- platform_admin or no system role → Superadmin
      rbac_role_id := '00000000-0000-0000-0000-000000000001';
    END IF;

    -- Insert (skip if already has this exact role)
    INSERT INTO public.rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
    VALUES (rec.id, rbac_role_id, rec.id, now())
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Remove any other system RBAC roles (001 or 004) that don't match
    DELETE FROM public.rbac_user_roles
    WHERE user_id = rec.id
      AND role_id IN (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000004'
      )
      AND role_id <> rbac_role_id;
  END LOOP;
END $$;
