-- Delete the problematic pause event
DELETE FROM public.time_entry_events 
WHERE time_entry_id = '4b203013-3fdc-4002-8f35-c46930a04c8b' 
AND event_type = 'paused' 
AND event_timestamp = '2026-02-16 12:09:25.214+00';

-- Log a manual edit event to maintain the audit trail
INSERT INTO public.time_entry_events (time_entry_id, auth_user_id, event_type, event_timestamp, details)
VALUES (
  '4b203013-3fdc-4002-8f35-c46930a04c8b', 
  '78ab328e-b02f-471c-bf12-327655dfa1a7', 
  'manual_edit', 
  now(), 
  '{"reason": "Corrected duration by removing accidental pause", "previous_duration": 11665000, "new_duration": 22274000}'
);

-- Update the time entry duration
-- Start: 10:54:48.414, End: 17:06:02.799
-- Difference is 6 hours, 11 minutes, 14 seconds = 22,274,385 ms
UPDATE public.time_entries 
SET duration = 22274000 
WHERE id = '4b203013-3fdc-4002-8f35-c46930a04c8b';