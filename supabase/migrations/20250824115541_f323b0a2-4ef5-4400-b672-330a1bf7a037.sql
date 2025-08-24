-- Update the handle_new_user function to use proper ON CONFLICT handling
-- since we now have the correct unique constraints in place
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user with ON CONFLICT handling for auth_user_id
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
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    avatar = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;