import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async () => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get errors from the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: errors, error: fetchError } = await supabase
      .from("error_logs")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    // Group errors by type and severity
    const groupedErrors = (errors || []).reduce(
      (acc: Record<string, Record<string, number>>, error) => {
        const key = error.error_type;
        if (!acc[key]) {
          acc[key] = { info: 0, warning: 0, error: 0, critical: 0 };
        }
        acc[key][error.severity || "error"]++;
        return acc;
      },
      {}
    );

    // Generate report
    const report = {
      date: new Date().toISOString().split("T")[0],
      totalErrors: errors?.length || 0,
      errorsByType: groupedErrors,
      topErrors: (errors || []).slice(0, 5).map((e) => ({
        type: e.error_type,
        message: e.error_message,
        severity: e.severity,
        time: e.created_at,
      })),
    };

    console.log("📊 Daily Error Report:", JSON.stringify(report, null, 2));

    // TODO: Send report via email/Slack
    // For now, just log it and store in a reports table (optional)

    return new Response(JSON.stringify(report), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/* To set up scheduling:
  1. Deploy this function: supabase functions deploy daily-error-report
  2. Set up a cron job using pg_cron or call it via external scheduler
  3. Example cron: Run daily at 9:00 AM UTC

  supabase_url = "your-project-url"
  supabase_key = "your-service-key"

  Then use a tool like GitHub Actions or a cron service to POST to:
  https://your-project.supabase.co/functions/v1/daily-error-report
  with Authorization: Bearer your-service-key
*/
