-- Create a cron job to run task reminders daily at 9 AM
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the task reminders to run daily at 9:00 AM
SELECT cron.schedule(
  'send-daily-task-reminders',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/send-task-reminders',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);