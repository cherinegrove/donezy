-- Create the missing user record for cherine@cybersolve.net
INSERT INTO users (
  auth_user_id, 
  name, 
  email, 
  role
) VALUES (
  'f7038878-4389-4cac-bdf5-76b5f06baca1'::uuid,
  'Cherine',
  'cherine@cybersolve.net',
  'admin'
);