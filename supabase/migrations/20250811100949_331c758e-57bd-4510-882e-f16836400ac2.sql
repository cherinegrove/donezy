-- Update the handle_new_user function to work with the users table
-- and make new signups admin by default
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

-- Ensure the trigger exists on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create a subscription creation trigger for account management
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create a free subscription for new users
  INSERT INTO public.account_subscriptions (
    user_id, 
    plan_type, 
    max_users, 
    max_guests,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    'free', 
    5,  -- Allow 5 users on free plan
    2,  -- Allow 2 guests on free plan
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for subscription creation
DROP TRIGGER IF EXISTS on_auth_user_subscription ON auth.users;
CREATE TRIGGER on_auth_user_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();