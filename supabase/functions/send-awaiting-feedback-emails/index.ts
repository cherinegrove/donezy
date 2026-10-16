// DISABLED. All email notifications are now owned by the notification center
// (notification_preferences + dispatch-notification). This scheduled function
// used to email "awaiting feedback" follow-ups outside that system, ignoring
// per-user preferences.
//
// Its pg_cron trigger (send-awaiting-feedback-emails-daily) is owned by
// supabase_read_only_user and can't be unscheduled from the standard postgres
// connection, so the function body is neutered instead: the daily invocation
// still fires but does nothing. Remove the cron job from the Supabase
// dashboard (Integrations -> Cron) to fully retire it.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      disabled: true,
      message:
        "send-awaiting-feedback-emails is disabled; email is handled by the notification center.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
