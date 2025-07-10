-- Insert default project statuses for the current user
INSERT INTO project_status_definitions (auth_user_id, name, color, order_index) VALUES
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'Planning', 'bg-blue-500', 0),
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'In Progress', 'bg-yellow-500', 1),
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'Review', 'bg-purple-500', 2),
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'On Hold', 'bg-orange-500', 3),
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'Completed', 'bg-green-500', 4),
  ('f7038878-4389-4cac-bdf5-76b5f06baca1', 'Cancelled', 'bg-red-500', 5);