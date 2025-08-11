-- Fix user role and make them Super Admin
-- First, ensure the current authenticated user has a proper user record
INSERT INTO public.users (
  auth_user_id, 
  name, 
  email, 
  role
) 
VALUES (
  auth.uid(),
  'Super Admin',
  'admin@donezy.io',
  'admin'
) 
ON CONFLICT (auth_user_id) 
DO UPDATE SET 
  role = 'admin',
  name = COALESCE(EXCLUDED.name, users.name),
  email = COALESCE(EXCLUDED.email, users.email);

-- Ensure platform_admin system role exists
INSERT INTO public.system_roles (name, description, permissions)
VALUES (
  'platform_admin'::system_role_type,
  'Platform Administrator with full system access',
  '{"all": true, "manage_users": true, "manage_organizations": true, "system_admin": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Assign platform_admin role to current user
INSERT INTO public.user_system_roles (user_id, system_role_id, assigned_by)
SELECT 
  auth.uid(),
  sr.id,
  auth.uid()
FROM public.system_roles sr 
WHERE sr.name = 'platform_admin'::system_role_type
ON CONFLICT DO NOTHING;

-- Also create a custom admin role if it doesn't exist
INSERT INTO public.custom_roles (
  auth_user_id,
  name,
  description,
  color,
  permissions
)
VALUES (
  auth.uid(),
  'Super Admin',
  'Full administrative access to all features',
  '#dc2626',
  '{"dashboard": "edit", "projects": "delete", "tasks": "delete", "timeTracking": "delete", "clients": "delete", "teams": "delete", "users": "delete", "reports": "delete", "messages": "delete", "notes": "delete", "settings": "delete"}'::jsonb
)
ON CONFLICT DO NOTHING;