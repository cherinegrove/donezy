-- Security fix: new signups previously received Platform Superadmin
-- ('00000000-0000-0000-0000-000000000001'). Default is now Project Collaborator
-- ('00000000-0000-0000-0000-000000000003'); admins can elevate users afterwards.
-- Existing users and their roles are not modified.
CREATE OR REPLACE FUNCTION public.assign_rbac_superadmin_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000003',  -- Project Collaborator (least privilege)
    NEW.id,  -- self-assigned at signup
    now()
  )
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
