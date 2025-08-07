-- Update the user_system_roles policies to allow admin users to assign roles
DROP POLICY IF EXISTS "Platform admins can manage user system roles" ON public.user_system_roles;

-- Allow admin users to assign system roles
CREATE POLICY "Admin users can assign system roles" ON public.user_system_roles
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow platform admins to manage all user system roles
CREATE POLICY "Platform admins can manage user system roles" ON public.user_system_roles
FOR ALL 
TO authenticated
USING (can_assign_system_roles(auth.uid()))
WITH CHECK (can_assign_system_roles(auth.uid()));

-- Allow admin users to view system role assignments
CREATE POLICY "Admin users can view system role assignments" ON public.user_system_roles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admin users to delete system role assignments
CREATE POLICY "Admin users can delete system role assignments" ON public.user_system_roles
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);