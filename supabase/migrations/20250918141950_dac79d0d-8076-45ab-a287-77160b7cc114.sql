-- Clear all data for fresh start
-- Delete in order to avoid foreign key constraints

-- Clear user-organization relationships first
DELETE FROM user_organizations;

-- Clear users
DELETE FROM users;

-- Clear organizations
DELETE FROM organizations;

-- Also clear any related data that might reference users
DELETE FROM projects;
DELETE FROM tasks;
DELETE FROM notes;
DELETE FROM messages;
DELETE FROM custom_roles;
DELETE FROM custom_fields;
DELETE FROM time_entries;
DELETE FROM purchases;
DELETE FROM clients;
DELETE FROM task_logs;

-- Reset any auto-increment sequences if needed
-- (UUID primary keys don't need this, but keeping for completeness)