-- Update the handle_new_user function to respect the role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert new user into public.users
    INSERT INTO public.users (
        auth_user_id,
        name,
        email,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,  -- Supabase Auth user ID
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),  -- Use role from metadata, default to 'user'
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        updated_at = NOW();

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but do not block signup
    RAISE NOTICE 'Error in handle_new_user for email=% auth_user_id=%: %', NEW.email, NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;