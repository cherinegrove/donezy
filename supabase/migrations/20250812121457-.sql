-- Add DELETE policy for users table to allow admins to delete users
CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users admin_user
    WHERE admin_user.auth_user_id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);