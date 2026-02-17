-- Fix time entries that have end_time but are not marked as completed
UPDATE public.time_entries 
SET timer_status = 'completed' 
WHERE end_time IS NOT NULL 
AND timer_status != 'completed';

-- Log audit events for the fixes
INSERT INTO public.time_entry_events (time_entry_id, event_type, event_timestamp, auth_user_id, details)
SELECT id, 'status_changed', now(), auth_user_id, 
  jsonb_build_object('from', timer_status, 'to', 'completed', 'reason', 'Auto-fix: end_time set but status was not completed')
FROM public.time_entries 
WHERE end_time IS NOT NULL AND timer_status != 'completed';