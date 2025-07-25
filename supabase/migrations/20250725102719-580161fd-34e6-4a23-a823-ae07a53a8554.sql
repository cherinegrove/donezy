-- Add owner and collaborator fields to projects table
ALTER TABLE projects 
ADD COLUMN owner_id uuid REFERENCES users(id),
ADD COLUMN collaborator_ids text[] DEFAULT '{}';

-- Update the RLS policies to allow access to project owners and collaborators
-- (policies are already set up to work with auth_user_id which should be sufficient)