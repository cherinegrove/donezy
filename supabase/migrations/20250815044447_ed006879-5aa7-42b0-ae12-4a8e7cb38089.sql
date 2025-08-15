-- Delete the incorrect timer that has yesterday's start time
DELETE FROM time_entries 
WHERE id = '9f177ba5-cbf3-43cf-a031-66e29e4d3a28'
AND start_time < CURRENT_DATE;