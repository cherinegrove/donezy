-- Update existing task statuses to match kanban expectations
UPDATE tasks 
SET status = CASE 
  WHEN status = 'To Do' THEN 'todo'
  WHEN status = 'In Progress' THEN 'in-progress' 
  WHEN status = 'Done' THEN 'done'
  WHEN status = 'Review' THEN 'review'
  WHEN status = 'Backlog' THEN 'backlog'
  ELSE LOWER(REPLACE(status, ' ', '-'))
END
WHERE status IN ('To Do', 'In Progress', 'Done', 'Review', 'Backlog') 
   OR status NOT IN ('todo', 'in-progress', 'done', 'review', 'backlog');