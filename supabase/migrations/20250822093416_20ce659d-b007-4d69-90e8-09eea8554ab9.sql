-- Create a unique constraint that allows multiple NULL values
-- This is necessary because invited users have NULL auth_user_id until they sign up
CREATE UNIQUE INDEX users_auth_user_id_unique_idx 
ON public.users (auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Alternative approach: Update the handle_new_user function to handle the constraint properly
-- Since we can't use ON CONFLICT with a partial unique index, we'll use a different approach
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    -- Update existing user
    UPDATE public.users SET
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      updated_at = NOW()
    WHERE auth_user_id = NEW.id;
  ELSE
    -- Insert new user
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
    );
  END IF;
  
  RETURN NEW;
END;
$$;