-- Add unique constraint on auth_user_id to support the ON CONFLICT clause in handle_new_user function
ALTER TABLE public.users 
ADD CONSTRAINT users_auth_user_id_unique UNIQUE (auth_user_id);

-- Update the handle_new_user function to work correctly with the unique constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert new user into the users table with admin role by default
  INSERT INTO public.users (
    auth_user_id,
    name,
    email,
    role,
    avatar,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin', -- Default role for new signups
    NEW.raw_user_meta_data->>'avatar_url',
    'USD',
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;