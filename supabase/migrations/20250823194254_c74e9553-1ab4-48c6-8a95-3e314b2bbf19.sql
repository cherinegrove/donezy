-- The users table is missing primary key constraint!
-- This is why the handle_new_user function is failing

-- Add primary key constraint to the id column
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Also ensure the unique constraint on email exists for data integrity
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);