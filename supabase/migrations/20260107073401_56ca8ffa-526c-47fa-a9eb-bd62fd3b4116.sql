-- Create a trigger to automatically log 'started' event when a new active time entry is created
-- This is a belt-and-suspenders approach to ensure events are always logged

CREATE OR REPLACE FUNCTION public.auto_log_time_entry_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log for new entries without end_time (active timers)
  IF NEW.end_time IS NULL THEN
    INSERT INTO time_entry_events (
      time_entry_id,
      auth_user_id,
      event_type,
      event_timestamp,
      details
    ) VALUES (
      NEW.id,
      NEW.auth_user_id,
      'started',
      NEW.start_time,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'project_id', NEW.project_id,
        'client_id', NEW.client_id,
        'trigger', 'auto'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on time_entries insert
DROP TRIGGER IF EXISTS on_time_entry_insert_log_started ON time_entries;
CREATE TRIGGER on_time_entry_insert_log_started
  AFTER INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_time_entry_started();

-- Also create a trigger to log 'stopped' event when end_time is set
CREATE OR REPLACE FUNCTION public.auto_log_time_entry_stopped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log when end_time goes from NULL to a value (timer stopped)
  IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    INSERT INTO time_entry_events (
      time_entry_id,
      auth_user_id,
      event_type,
      event_timestamp,
      details
    ) VALUES (
      NEW.id,
      NEW.auth_user_id,
      'stopped',
      NEW.end_time,
      jsonb_build_object(
        'duration', NEW.duration,
        'notes', NEW.notes,
        'trigger', 'auto'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on time_entries update
DROP TRIGGER IF EXISTS on_time_entry_update_log_stopped ON time_entries;
CREATE TRIGGER on_time_entry_update_log_stopped
  AFTER UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_time_entry_stopped();