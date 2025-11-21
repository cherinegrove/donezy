-- Add order_index field to tasks table for custom ordering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better performance on order queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_order ON tasks(project_id, status, order_index);