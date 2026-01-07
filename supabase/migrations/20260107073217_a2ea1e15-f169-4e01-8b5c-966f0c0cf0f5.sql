-- Fix the orphaned timer: Stop it with 0 duration since we don't know actual work time
-- Also add an event for audit trail
UPDATE time_entries 
SET end_time = start_time, 
    duration = 0, 
    status = 'completed',
    notes = 'Auto-closed: Timer was orphaned without events'
WHERE id = 'ad022022-e0e6-4082-90d9-c4e08b4083fa';

-- Add an event for the audit trail
INSERT INTO time_entry_events (
  time_entry_id, 
  event_type, 
  event_timestamp, 
  auth_user_id,
  details
) VALUES (
  'ad022022-e0e6-4082-90d9-c4e08b4083fa',
  'auto_stopped',
  NOW(),
  '78ab328e-b02f-471c-bf12-327655dfa1a7',
  '{"reason": "Orphaned timer without start event - auto-closed by admin"}'::jsonb
);