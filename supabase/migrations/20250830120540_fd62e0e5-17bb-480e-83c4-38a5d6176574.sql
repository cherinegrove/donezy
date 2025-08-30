-- Create the missing user record for the authenticated user
INSERT INTO public.users (
  auth_user_id,
  name,
  email,
  role,
  created_at,
  updated_at
)
VALUES (
  'f7038878-4389-4cac-bdf5-76b5f06baca1',
  'Cherine Grove',
  'cherine@cybersolve.net',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (auth_user_id) DO NOTHING;