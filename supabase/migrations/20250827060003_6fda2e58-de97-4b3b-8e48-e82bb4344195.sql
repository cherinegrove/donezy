-- Improve users table structure with auth_user_id as primary key

-- First, check if there are any foreign key references to users.id
-- If this migration fails due to foreign key constraints, we'll need to handle those first

-- Drop the current primary key constraint
ALTER TABLE public.users DROP CONSTRAINT users_pkey;

-- Make auth_user_id the primary key (it's already NOT NULL and UNIQUE)
ALTER TABLE public.users ADD PRIMARY KEY (auth_user_id);

-- Drop the old id column since auth_user_id is now our primary identifier
ALTER TABLE public.users DROP COLUMN id;

-- Keep email unique with an explicit index for better search performance
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users(email);

-- Update the trigger function with better error logging
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
    ON CONFLICT (auth_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        updated_at = NOW();

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Enhanced error logging with user details
    RAISE NOTICE 'Error in handle_new_user for email=% auth_user_id=%: %', NEW.email, NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;