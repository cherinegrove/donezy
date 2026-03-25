
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-send-weekly-roundups edge function to run every hour
-- It checks internally if day + hour match each project's schedule
SELECT cron.schedule(
  'auto-send-weekly-roundups',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/auto-send-weekly-roundups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
