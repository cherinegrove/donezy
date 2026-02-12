
-- Fix ALL stuck timers globally: any entry with an end_time but still marked active/paused
-- should be marked as completed
UPDATE time_entries 
SET timer_status = 'completed',
    updated_at = now()
WHERE end_time IS NOT NULL 
  AND timer_status IN ('active', 'paused');
