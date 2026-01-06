-- Add RLS policy to allow admins to update any user
CREATE POLICY "Admins can update any user" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users admin_user 
    WHERE admin_user.auth_user_id = auth.uid() 
    AND admin_user.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users admin_user 
    WHERE admin_user.auth_user_id = auth.uid() 
    AND admin_user.role = 'admin'
  )
);