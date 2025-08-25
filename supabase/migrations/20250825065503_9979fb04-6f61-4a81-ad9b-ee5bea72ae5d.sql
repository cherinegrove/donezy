-- Create backup table for duplicate emails (safety first)
CREATE TABLE IF NOT EXISTS public.users_email_duplicates AS
SELECT * FROM public.users WHERE false; -- empty shell

-- Backup duplicate emails before deletion
INSERT INTO public.users_email_duplicates
SELECT *
FROM public.users a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (email) id 
    FROM public.users 
    ORDER BY email, created_at DESC
);

-- Clean up duplicates from main table
DELETE FROM public.users a
WHERE a.id IN (SELECT id FROM public.users_email_duplicates);

-- Add unique constraint on email with IF NOT EXISTS guard
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END$$;

-- Update the trigger function with improved error handling and safer defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert new user or update existing one
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
        'user', -- safer default role
        NEW.raw_user_meta_data->>'avatar_url',
        'USD',
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        updated_at = NOW();

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging, but don't block signup
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;