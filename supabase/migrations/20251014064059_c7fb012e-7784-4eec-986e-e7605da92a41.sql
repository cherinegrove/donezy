-- Remove duplicate task status definitions, keeping only the first set
DELETE FROM public.task_status_definitions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY auth_user_id, value ORDER BY created_at) as rn
    FROM public.task_status_definitions
  ) t
  WHERE t.rn > 1
);