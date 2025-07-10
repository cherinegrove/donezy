-- Insert default project statuses for the current user
INSERT INTO project_status_definitions (auth_user_id, name, color, order_index, is_final)
SELECT 
  auth.uid(),
  status_name,
  status_color,
  status_order,
  status_final
FROM (VALUES 
  ('Planning', '#3B82F6', 0, false),
  ('In Progress', '#F59E0B', 1, false),
  ('Review', '#8B5CF6', 2, false),
  ('On Hold', '#6B7280', 3, false),
  ('Completed', '#10B981', 4, true),
  ('Cancelled', '#EF4444', 5, true)
) AS default_statuses(status_name, status_color, status_order, status_final)
WHERE auth.uid() IS NOT NULL;