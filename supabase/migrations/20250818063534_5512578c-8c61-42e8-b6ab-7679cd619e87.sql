-- Create RLS policies for users table to allow proper access

-- Allow users to view all users in their organization (for user management)
CREATE POLICY "Users can view users in their organization" 
ON public.users 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Allow viewing all users if current user is admin
    (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
    OR
    -- Or if they are viewing their own record
    auth_user_id = auth.uid()
  )
);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Allow admins to update any user
CREATE POLICY "Admins can update any user" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
);

-- Allow admins to delete users
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (
  (SELECT role FROM public.users WHERE auth_user_id = auth.uid()) = 'admin'
);