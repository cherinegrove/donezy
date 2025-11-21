-- Create function to send task notifications
CREATE OR REPLACE FUNCTION notify_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_type TEXT;
  old_task_json JSONB;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := 'task_created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if assignee changed
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      event_type := 'task_assigned';
      old_task_json := row_to_json(OLD)::jsonb;
    -- Check if status changed to done/completed
    ELSIF OLD.status != NEW.status AND NEW.status = 'done' THEN
      event_type := 'task_completed';
    ELSE
      event_type := 'task_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  -- Call edge function asynchronously (fire and forget)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-task-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'taskId', NEW.id,
      'projectId', NEW.project_id,
      'eventType', event_type,
      'oldTask', old_task_json
    )
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;

-- Create trigger for task notifications
CREATE TRIGGER task_notification_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_change();