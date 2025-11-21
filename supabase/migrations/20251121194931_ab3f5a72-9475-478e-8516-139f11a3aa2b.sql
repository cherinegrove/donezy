-- Drop the trigger since we're handling notifications from application code
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
DROP FUNCTION IF EXISTS notify_task_change();