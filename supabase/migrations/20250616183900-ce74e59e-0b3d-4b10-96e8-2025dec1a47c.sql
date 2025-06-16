
-- Add a function to automatically create a default channel when a project is created
CREATE OR REPLACE FUNCTION create_default_project_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default channel for the new project
  INSERT INTO public.channels (
    project_id,
    name,
    description,
    is_private,
    created_by
  ) VALUES (
    NEW.id,
    NEW.name || ' Chat',
    'Default chat channel for ' || NEW.name,
    false,
    NEW.auth_user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires after a project is inserted
CREATE TRIGGER trigger_create_default_project_channel
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_project_channel();

-- For existing projects that don't have channels, create default channels
INSERT INTO public.channels (project_id, name, description, is_private, created_by)
SELECT 
  p.id,
  p.name || ' Chat',
  'Default chat channel for ' || p.name,
  false,
  p.auth_user_id
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.project_id = p.id
);
