-- First, drop the overly permissive policy that allows viewing all users
DROP POLICY IF EXISTS "Users can view all users in their organization" ON public.users;

-- Create a security definer function to get current user's organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Create a more secure policy that only allows users to view users in their own organization
CREATE POLICY "Users can view users in their organization" 
ON public.users 
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own profile
  auth_user_id = auth.uid() 
  OR 
  -- Users can see other users in the same organization
  (
    organization_id IS NOT NULL 
    AND organization_id = public.get_current_user_organization()
  )
  OR
  -- System admins can see all users
  (
    has_system_role(auth.uid(), 'platform_admin'::system_role_type) 
    OR has_system_role(auth.uid(), 'support_admin'::system_role_type)
  )
);