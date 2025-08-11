-- First check if the user exists and update their role to admin
UPDATE public.users 
SET role = 'admin', 
    name = 'Super Admin'
WHERE auth_user_id = auth.uid();

-- If the user doesn't exist, insert them
INSERT INTO public.users (
  auth_user_id, 
  name, 
  email, 
  role
) 
SELECT 
  auth.uid(),
  'Super Admin',
  'admin@donezy.io',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE auth_user_id = auth.uid()
);

-- Ensure platform_admin system role exists
INSERT INTO public.system_roles (name, description, permissions)
VALUES (
  'platform_admin'::system_role_type,
  'Platform Administrator with full system access',
  '{"all": true, "manage_users": true, "manage_organizations": true, "system_admin": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Assign platform_admin role to current user
WITH admin_role AS (
  SELECT id FROM public.system_roles WHERE name = 'platform_admin'::system_role_type
)
INSERT INTO public.user_system_roles (user_id, system_role_id, assigned_by)
SELECT 
  auth.uid(),
  admin_role.id,
  auth.uid()
FROM admin_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_system_roles 
  WHERE user_id = auth.uid() AND system_role_id = admin_role.id
);

-- Create a custom admin role
INSERT INTO public.custom_roles (
  auth_user_id,
  name,
  description,
  color,
  permissions
)
SELECT
  auth.uid(),
  'Super Admin',
  'Full administrative access to all features',
  '#dc2626',
  '{"dashboard": "edit", "projects": "delete", "tasks": "delete", "timeTracking": "delete", "clients": "delete", "teams": "delete", "users": "delete", "reports": "delete", "messages": "delete", "notes": "delete", "settings": "delete"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles 
  WHERE auth_user_id = auth.uid() AND name = 'Super Admin'
);