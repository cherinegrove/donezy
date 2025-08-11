-- Update the existing user with the email from auth logs to be admin
UPDATE public.users 
SET role = 'admin', 
    name = 'Super Admin'
WHERE email = 'cherine@cybersolve.net';

-- Also update any user with 'admin' in their email to be admin
UPDATE public.users 
SET role = 'admin'
WHERE email ILIKE '%admin%' OR role = 'owner';

-- Ensure platform_admin system role exists
INSERT INTO public.system_roles (name, description, permissions)
VALUES (
  'platform_admin'::system_role_type,
  'Platform Administrator with full system access',
  '{"all": true, "manage_users": true, "manage_organizations": true, "system_admin": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Create a Super Admin custom role that can be used
INSERT INTO public.custom_roles (
  auth_user_id,
  name,
  description,
  color,
  permissions
)
SELECT
  u.auth_user_id,
  'Super Admin',
  'Full administrative access to all features',
  '#dc2626',
  '{"dashboard": "edit", "projects": "delete", "tasks": "delete", "timeTracking": "delete", "clients": "delete", "teams": "delete", "users": "delete", "reports": "delete", "messages": "delete", "notes": "delete", "settings": "delete"}'::jsonb
FROM public.users u
WHERE u.role = 'admin' AND u.auth_user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.custom_roles 
  WHERE auth_user_id = u.auth_user_id AND name = 'Super Admin'
);