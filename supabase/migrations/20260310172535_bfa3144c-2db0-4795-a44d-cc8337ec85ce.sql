-- Fix the bad entry: duration should be the active time before auto-pause
-- elapsedMs from the auto_paused event = 1418573ms = ~23.6 min -> 24 min
UPDATE time_entries
SET duration = 24, notes = 'Timer cancelled (duration corrected from 7498 to 24 min)'
WHERE id = 'b0830b8c-6960-4802-aa6c-c996844fad22';