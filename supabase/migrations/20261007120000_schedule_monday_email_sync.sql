-- Run monday-email-sync every 10 minutes. The bearer is the project's public
-- anon key (same one the web app ships), enough to pass verify_jwt; the
-- function itself is idempotent, so extra calls are harmless.
do $$
begin
  perform cron.unschedule('monday-email-sync');
exception when others then null;
end $$;

select cron.schedule('monday-email-sync', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/monday-email-sync',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3hreWdkbGNsY2J5eHJ0cHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMDU2OTUsImV4cCI6MjA2MTY4MTY5NX0._p3ZxKJSSzOkZO6xml4kvg9vOA64Qlxhg5HNhuEAF-0"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
