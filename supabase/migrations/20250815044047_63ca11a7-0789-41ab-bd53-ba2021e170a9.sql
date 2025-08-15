-- Clean up the orphaned timer entry that's causing confusion
-- This timer from yesterday is no longer needed and can't be accessed by the current session
DELETE FROM time_entries 
WHERE id = 'e4b8933e-9465-46c1-9a31-46814fed3f7c'
AND status = 'pending';