-- Allow admin users to view system roles
CREATE POLICY "Admin users can view system roles" ON public.system_roles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);