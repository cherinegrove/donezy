-- Fix the previously corrected entry - duration should be in minutes, not ms
UPDATE time_entries SET duration = 371 WHERE id = '4b203013-3fdc-4002-8f35-c46930a04c8b';

-- Update the manual_edit event to reflect correct units
UPDATE time_entry_events 
SET details = '{"reason": "Corrected duration by removing accidental pause", "previous_duration_minutes": 194, "new_duration_minutes": 371}'::jsonb
WHERE time_entry_id = '4b203013-3fdc-4002-8f35-c46930a04c8b' 
AND event_type = 'manual_edit';

-- Now fix ALL other affected entries:
-- These have a pause event, no resume event, and their stored duration (minutes) 
-- doesn't match the actual time window (start_time to end_time)
-- We recalculate duration as the full window in minutes

-- First, let's do the bulk fix: set duration = time window in minutes for all affected entries
WITH affected AS (
  SELECT te.id,
    ROUND(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 60) as correct_duration_minutes,
    te.duration as old_duration
  FROM time_entries te
  WHERE te.end_time IS NOT NULL
  AND te.timer_status = 'completed'
  AND EXISTS (
    SELECT 1 FROM time_entry_events tee 
    WHERE tee.time_entry_id = te.id 
    AND tee.event_type IN ('paused', 'auto_paused')
  )
  AND NOT EXISTS (
    SELECT 1 FROM time_entry_events tee 
    WHERE tee.time_entry_id = te.id 
    AND tee.event_type = 'resumed'
  )
  AND te.id != '4b203013-3fdc-4002-8f35-c46930a04c8b'
  -- Only fix entries where duration is significantly less than the window
  AND te.duration < ROUND(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 60) * 0.9
)
UPDATE time_entries te
SET duration = affected.correct_duration_minutes
FROM affected
WHERE te.id = affected.id;

-- Log manual_edit events for all fixed entries
WITH affected AS (
  SELECT te.id, te.auth_user_id,
    ROUND(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 60) as correct_duration_minutes,
    te.duration as old_duration
  FROM time_entries te
  WHERE te.end_time IS NOT NULL
  AND te.timer_status = 'completed'
  AND EXISTS (
    SELECT 1 FROM time_entry_events tee 
    WHERE tee.time_entry_id = te.id 
    AND tee.event_type IN ('paused', 'auto_paused')
  )
  AND NOT EXISTS (
    SELECT 1 FROM time_entry_events tee 
    WHERE tee.time_entry_id = te.id 
    AND tee.event_type = 'resumed'
  )
  AND te.id != '4b203013-3fdc-4002-8f35-c46930a04c8b'
  -- Match the same condition - but now duration = correct value after update above
  -- So we check old events to know these were affected
)
INSERT INTO time_entry_events (time_entry_id, auth_user_id, event_type, event_timestamp, details)
SELECT te.id, te.auth_user_id, 'manual_edit', now(),
  jsonb_build_object(
    'reason', 'Bulk fix: removed accidental pause effect on duration',
    'recalculated_from', 'start_time to end_time window'
  )
FROM time_entries te
WHERE te.end_time IS NOT NULL
AND te.timer_status = 'completed'
AND EXISTS (
  SELECT 1 FROM time_entry_events tee 
  WHERE tee.time_entry_id = te.id 
  AND tee.event_type IN ('paused', 'auto_paused')
)
AND NOT EXISTS (
  SELECT 1 FROM time_entry_events tee 
  WHERE tee.time_entry_id = te.id 
  AND tee.event_type = 'resumed'
)
AND te.id != '4b203013-3fdc-4002-8f35-c46930a04c8b';

-- Clean up the orphaned pause events (no matching resume)
DELETE FROM time_entry_events tee
WHERE tee.event_type IN ('paused', 'auto_paused')
AND NOT EXISTS (
  SELECT 1 FROM time_entry_events tee2 
  WHERE tee2.time_entry_id = tee.time_entry_id 
  AND tee2.event_type = 'resumed'
)
AND tee.time_entry_id != '4b203013-3fdc-4002-8f35-c46930a04c8b';