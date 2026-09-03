import { supabase } from "@/integrations/supabase/client";

export interface ErrorLogEntry {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  endpoint?: string;
  statusCode?: number;
  requestData?: any;
  responseData?: any;
  context?: any;
  severity?: "info" | "warning" | "error" | "critical";
}

/**
 * Log an error to the database
 * Used for tracking backend errors, API failures, edge function errors, etc.
 */
export async function logError(entry: ErrorLogEntry, userId?: string) {
  try {
    const { error } = await supabase.from("error_logs").insert({
      error_type: entry.errorType,
      error_message: entry.errorMessage,
      error_stack: entry.errorStack,
      user_id: userId || null,
      endpoint: entry.endpoint,
      status_code: entry.statusCode,
      request_data: entry.requestData,
      response_data: entry.responseData,
      context: entry.context,
      severity: entry.severity || "error",
    });

    if (error) {
      console.error("Failed to log error to database:", error);
    }
  } catch (err) {
    console.error("Error logging service failed:", err);
  }
}

/**
 * Log API errors (for use in API endpoints and Supabase functions)
 */
export async function logApiError(
  endpoint: string,
  error: any,
  statusCode?: number,
  requestData?: any,
  userId?: string
) {
  await logError(
    {
      errorType: "API_ERROR",
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      endpoint,
      statusCode: statusCode || 500,
      requestData,
      severity: statusCode && statusCode < 500 ? "warning" : "error",
    },
    userId
  );
}

/**
 * Log database errors
 */
export async function logDatabaseError(
  operation: string,
  error: any,
  context?: any,
  userId?: string
) {
  await logError(
    {
      errorType: "DATABASE_ERROR",
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      endpoint: `database_${operation}`,
      context: { operation, ...context },
      severity: "error",
    },
    userId
  );
}

/**
 * Get error summary for the last N hours
 */
export async function getErrorSummary(hours: number = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("error_logs")
      .select("error_type, severity, count(*) as count")
      .gte("created_at", since)
      .group_by("error_type", "severity")
      .order("count", { ascending: false });

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Failed to fetch error summary:", err);
    return [];
  }
}

/**
 * Get recent errors
 */
export async function getRecentErrors(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Failed to fetch recent errors:", err);
    return [];
  }
}
