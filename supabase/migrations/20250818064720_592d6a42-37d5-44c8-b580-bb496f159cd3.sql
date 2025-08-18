-- Create an organization for the current user and assign them to it
WITH new_org AS (
  INSERT INTO public.organizations (
    name,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'Donezy Organization',
    'f7038878-4389-4cac-bdf5-76b5f06baca1',
    NOW(),
    NOW()
  )
  RETURNING id
)
UPDATE public.users 
SET organization_id = (SELECT id FROM new_org)
WHERE auth_user_id = 'f7038878-4389-4cac-bdf5-76b5f06baca1';

-- Also add the user to the user_organizations table for proper organization membership
WITH user_org AS (
  SELECT 
    u.auth_user_id as user_id,
    u.organization_id
  FROM public.users u 
  WHERE u.auth_user_id = 'f7038878-4389-4cac-bdf5-76b5f06baca1'
)
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT user_id, organization_id FROM user_org
ON CONFLICT (user_id, organization_id) DO NOTHING;