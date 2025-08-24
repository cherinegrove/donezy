-- The issue might be that our trigger function cannot insert due to RLS policies
-- Let's check if we can bypass RLS for the trigger function
-- Create a version that explicitly bypasses RLS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_user_count INTEGER;
BEGIN
    -- Check if user with this email already exists
    SELECT COUNT(*) INTO existing_user_count 
    FROM public.users 
    WHERE email = NEW.email;
    
    IF existing_user_count = 0 THEN
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
    ELSE
        -- Update existing user
        UPDATE public.users SET
            auth_user_id = NEW.id,
            name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
            avatar = NEW.raw_user_meta_data->>'avatar_url',
            updated_at = NOW()
        WHERE email = NEW.email;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW; -- Don't block signup even if user creation fails
END;
$$;