-- All email notifications are now owned by the notification center
-- (notification_preferences + dispatch-notification). These pg_cron jobs sent
-- email outside that system, ignoring per-user preferences, and were invisible
-- in the app UI:
--   * send-daily-task-reminders           (daily) -> send-task-reminders
--   * send-awaiting-feedback-emails-daily  (daily) -> send-awaiting-feedback-emails
--   * auto-send-weekly-roundups            (hourly) -> auto-send-weekly-roundups (was failing every run)
--
-- send-daily-task-reminders and auto-send-weekly-roundups are owned by
-- `postgres` and are unscheduled here. send-awaiting-feedback-emails-daily is
-- owned by `supabase_read_only_user` and cannot be unscheduled from the
-- standard postgres connection (not a member of that role, not superuser); its
-- edge function has been neutered to a no-op instead, and the cron row should
-- be deleted from the Supabase dashboard (Integrations -> Cron) to fully
-- retire it. Each unschedule is guarded so this migration is a safe no-op on
-- environments where the jobs don't exist (e.g. fresh databases).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN PERFORM cron.unschedule('send-daily-task-reminders'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('auto-send-weekly-roundups'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('send-awaiting-feedback-emails-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
