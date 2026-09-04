import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const googleChatWebhook = Deno.env.get("GOOGLE_CHAT_WEBHOOK_URL");

interface ErrorLogEntry {
  id: string;
  error_type: string;
  error_message: string;
  severity: string;
  endpoint?: string;
  user_id?: string;
  created_at: string;
  context?: any;
}

// Common error patterns and proposed fixes
const errorPatterns: Record<string, string> = {
  "NETWORK_ERROR": "Check network connectivity, retry logic, and API endpoint availability",
  "DATABASE_ERROR": "Check database connection, queries, and constraint violations",
  "AUTH_ERROR": "Verify user authentication, tokens, and permissions",
  "VALIDATION_ERROR": "Review input validation rules and error messages",
  "TIMEOUT_ERROR": "Increase timeout duration or optimize slow operations",
  "PERMISSION_ERROR": "Check user roles and access control policies",
  "API_ERROR": "Verify API endpoint, headers, and request format",
  "PARSE_ERROR": "Validate JSON/data format and encoding",
};

function getProposedFix(errorType: string): string {
  return errorPatterns[errorType] || "Review error logs and stack trace for details";
}

async function sendToGoogleChat(message: string) {
  if (!googleChatWebhook) {
    console.error("Google Chat webhook not configured");
    return;
  }

  try {
    const response = await fetch(googleChatWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.error("Failed to send Google Chat message:", response.status);
    }
  } catch (error) {
    console.error("Error sending Google Chat message:", error);
  }
}

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

    const errorList = errors || [];

    if (errorList.length === 0) {
      // No errors - send positive message
      const successMessage = `✅ *Daily Error Report - ${new Date().toLocaleDateString("en-ZA")}*\n\nNo errors in the past 24 hours! Keep up the good work! 🎉`;
      await sendToGoogleChat(successMessage);
      return new Response(
        JSON.stringify({ message: "No errors found", status: "success" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Group errors by type and severity
    const pivotTable: Record<string, Record<string, number>> = {};
    const errorDetails: Record<string, ErrorLogEntry[]> = {};

    errorList.forEach((error) => {
      const typeKey = error.error_type || "UNKNOWN";
      const severityKey = error.severity || "error";

      // Pivot table
      if (!pivotTable[typeKey]) {
        pivotTable[typeKey] = { critical: 0, error: 0, warning: 0, info: 0 };
      }
      pivotTable[typeKey][severityKey]++;

      // Store details for top errors
      if (!errorDetails[typeKey]) {
        errorDetails[typeKey] = [];
      }
      if (errorDetails[typeKey].length < 2) {
        errorDetails[typeKey].push(error);
      }
    });

    // Build the report
    let report = `🔍 *Daily Error Report - ${new Date().toLocaleDateString("en-ZA", {
      timeZone: "Africa/Johannesburg",
    })}*\n\n`;

    report += `📊 *Summary*\n`;
    report += `Total Errors: ${errorList.length}\n`;
    report += `Critical: ${errorList.filter((e) => e.severity === "critical").length}\n`;
    report += `Error: ${errorList.filter((e) => e.severity === "error").length}\n`;
    report += `Warning: ${errorList.filter((e) => e.severity === "warning").length}\n\n`;

    // Pivot table
    report += `📈 *Errors by Type & Severity*\n`;
    report += `\`\`\`\n`;
    report += `Type                 | Critical | Error | Warning | Info\n`;
    report += `─────────────────────┼──────────┼───────┼─────────┼─────\n`;

    Object.entries(pivotTable).forEach(([type, counts]) => {
      const typeStr = type.padEnd(20);
      report += `${typeStr} | ${String(counts.critical).padEnd(8)} | ${String(
        counts.error
      ).padEnd(5)} | ${String(counts.warning).padEnd(7)} | ${counts.info}\n`;
    });

    report += `\`\`\`\n\n`;

    // Top issues with proposed fixes
    report += `⚠️ *Top Issues & Proposed Fixes*\n\n`;

    let issueNum = 1;
    Object.entries(errorDetails)
      .slice(0, 5)
      .forEach(([type, errors]) => {
        const latestError = errors[0];
        const fix = getProposedFix(type);
        const endpoint = latestError.endpoint ? `Endpoint: ${latestError.endpoint}\n` : "";
        const message = latestError.error_message
          .substring(0, 100)
          .replace(/"/g, "'");

        report += `*${issueNum}. ${type}*\n`;
        report += `Message: ${message}\n`;
        report += endpoint;
        report += `Fix: ${fix}\n`;
        report += `Occurrences: ${errors.length}\n\n`;
        issueNum++;
      });

    report += `🔗 View full details: https://app.donezy.ai/error-audit`;

    console.log("📊 Sending error report to Google Chat...");
    await sendToGoogleChat(report);

    return new Response(
      JSON.stringify({
        message: "Report sent successfully",
        totalErrors: errorList.length,
        errorTypes: Object.keys(pivotTable).length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating daily report:", error);

    const errorMessage = `❌ *Error Report Generation Failed*\n\nCould not generate daily error report. Check logs for details.\n\nError: ${error.message}`;
    await sendToGoogleChat(errorMessage);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/*
SCHEDULING INSTRUCTIONS:

Option 1: GitHub Actions (Recommended)
Create .github/workflows/daily-error-report.yml:

name: Daily Error Report
on:
  schedule:
    - cron: '0 5 * * *'  # 5 AM UTC = 7 AM SAST (UTC+2)

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger error report
        run: |
          curl -X POST https://your-project.supabase.co/functions/v1/daily-error-report \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json"

Option 2: External Cron Service
Use https://cron-job.org or similar:
- URL: https://your-project.supabase.co/functions/v1/daily-error-report
- Method: POST
- Schedule: 05:00 UTC (7 AM SAST)
- Auth: Add Authorization header with Bearer token

Option 3: Manual Testing
curl -X POST https://your-project.supabase.co/functions/v1/daily-error-report \
  -H "Authorization: Bearer your-service-key"
*/
