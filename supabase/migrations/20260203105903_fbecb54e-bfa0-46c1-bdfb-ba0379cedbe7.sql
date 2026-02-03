-- Fix 2: Add timer_status column with backward compatibility

-- Step 1: Add the timer_status column
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS timer_status TEXT DEFAULT 'active' CHECK (timer_status IN ('active', 'paused', 'completed'));

-- Step 2: Migrate existing data safely
UPDATE public.time_entries 
SET timer_status = CASE 
  WHEN end_time IS NULL THEN 'active'
  ELSE 'completed'
END
WHERE timer_status IS NULL OR timer_status = 'active';

-- Step 3: Create a trigger function to keep timer_status in sync with end_time changes
-- This ensures backward compatibility with any code that still uses end_time directly
CREATE OR REPLACE FUNCTION public.sync_timer_status_with_end_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When end_time changes from NULL to a value, mark as completed
  IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    NEW.timer_status = 'completed';
  END IF;
  
  -- When end_time changes from a value to NULL (rare, but handle it), mark as active
  IF OLD.end_time IS NOT NULL AND NEW.end_time IS NULL THEN
    NEW.timer_status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
DROP TRIGGER IF EXISTS sync_timer_status_trigger ON public.time_entries;
CREATE TRIGGER sync_timer_status_trigger
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_timer_status_with_end_time();

-- Step 5: Create index for faster queries on timer_status
CREATE INDEX IF NOT EXISTS idx_time_entries_timer_status ON public.time_entries(timer_status);

-- Step 6: Create compound index for common query pattern
CREATE INDEX IF NOT EXISTS idx_time_entries_user_timer_status ON public.time_entries(user_id, timer_status);