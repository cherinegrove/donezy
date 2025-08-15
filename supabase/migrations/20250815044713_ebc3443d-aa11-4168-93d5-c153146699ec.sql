-- Clean up all pending time entries that don't have an end_time
-- These are leftover timer entries that were never properly stopped
DELETE FROM time_entries 
WHERE auth_user_id = 'f7038878-4389-4cac-bdf5-76b5f06baca1' 
AND status = 'pending' 
AND end_time IS NULL;