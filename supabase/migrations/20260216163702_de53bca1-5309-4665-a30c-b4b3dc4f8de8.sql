
-- Fix entries that have end_time but are stuck in 'paused' status
UPDATE time_entries
SET timer_status = 'completed'
WHERE end_time IS NOT NULL
AND timer_status = 'paused';

-- Log audit events for the fixed entries
INSERT INTO time_entry_events (time_entry_id, auth_user_id, event_type, event_timestamp, details)
SELECT id, auth_user_id, 'status_changed', now(),
  '{"reason": "Fix: entry had end_time but was stuck in paused status", "previousValue": "paused", "newValue": "completed"}'::jsonb
FROM time_entries
WHERE id IN (
  'b9f4d5d1-e010-4be2-a84e-93f58e53eb3f',
  '9a5cc08e-f18b-4fcc-a375-f94f6f43e9b2',
  'c03a9981-2e10-4c3b-8670-05fe1f4f09e3',
  '02fc951d-99f0-4c0b-b30b-c2e4e6a3f19b'
);
