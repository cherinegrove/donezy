-- Check if the handle_new_user trigger exists and is working correctly
DO $$
BEGIN
    -- First let's see what triggers exist
    RAISE NOTICE 'Checking triggers...';
    
    -- Test our function manually to see if it works
    RAISE NOTICE 'Testing handle_new_user function...';
END $$;

-- Let's also check if the trigger is properly attached
SELECT event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%';

-- And let's verify our function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';