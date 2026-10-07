import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskWithContext {
  id: string;
  title: string;
  description: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  latest_comment?: { content: string; author: string; date: string };
  hours_logged: number;
  has_blocker: boolean;
  blocker_note?: string;
}

// Detect blockers/risks from comment text
function detectBlocker(comment: string): { has_blocker: boolean; blocker_note?: string } {
  const blockerKeywords = [
    "blocked", "blocker", "stuck", "can't", "cannot", "unable",
    "issue", "problem", "error", "failed", "failure", "not working",
    "waiting for", "needs", "required", "depends on", "pending"
  ];

  const lowerComment = comment.toLowerCase();
  const found = blockerKeywords.find(keyword => lowerComment.includes(keyword));

  if (found) {
    // Extract a snippet around the blocker keyword
    const index = lowerComment.indexOf(found);
    const start = Math.max(0, index - 40);
    const end = Math.min(comment.length, index + found.length + 60);
    const snippet = comment.substring(start, end).trim();
    return { has_blocker: true, blocker_note: `"${snippet}"` };
  }

  return { has_blocker: false };
}

async function enrichTaskWithContext(
  supabase: any,
  task: any,
  projectId: string
): Promise<TaskWithContext> {
  // Fetch latest comment
  const { data: comments } = await supabase
    .from("task_comments")
    .select("id, content, user_id, created_at, users(name)")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let latest_comment: { content: string; author: string; date: string } | undefined;
  if (comments?.length > 0) {
    const c = comments[0];
    latest_comment = {
      content: c.content,
      author: c.users?.name || "Team member",
      date: new Date(c.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    };
  }

  // Fetch time entries for this task
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("duration")
    .eq("task_id", task.id);

  const hours_logged = (timeEntries || []).reduce((sum: number, te: any) => sum + (te.duration || 0), 0) / 60;

  // Detect blockers from latest comment
  const { has_blocker, blocker_note } = latest_comment
    ? detectBlocker(latest_comment.content)
    : { has_blocker: false };

  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    due_date: task.due_date,
    estimated_hours: task.estimated_hours,
    actual_hours: task.actual_hours,
    latest_comment,
    hours_logged,
    has_blocker,
    blocker_note,
  };
}

function generateEmailHtml(params: {
  projectName: string;
  clientName: string;
  completedTasks: TaskWithContext[];
  inProgressTasks: TaskWithContext[];
  awaitingTasks: TaskWithContext[];
  projectHealth: string;
  senderName: string;
}): string {
  const p = params;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const dateRange = `${fmt(weekStart)} – ${fmt(now)} ${now.getFullYear()}`;

  const healthText =
    p.projectHealth === "on-track"
      ? "✅ On Track – great progress this week!"
      : p.projectHealth === "blocked"
      ? "🚨 Blocked – multiple items need your input"
      : "⚠️ Needs Attention – some items are waiting on you";

  const taskStyle = `style="margin:12px 0;padding:12px;background:#f9fafb;border-left:3px solid #3b82f6;border-radius:4px;"`;
  const blockerStyle = `style="margin:4px 0;padding:8px;background:#fef2f2;border-left:2px solid #ef4444;color:#7f1d1d;font-size:13px;border-radius:3px;"`;

  // ── Completed section ──────────────────────────────────
  const completedSection = p.completedTasks.length > 0
    ? `<p style="margin:20px 0 12px;font-size:15px;color:#111827;"><strong>✅ Completed This Week</strong></p>
       ${p.completedTasks.map((t) => `
         <div ${taskStyle}>
           <p style="margin:0 0 4px;font-weight:600;color:#111827;">${t.title}</p>
           ${t.description ? `<p style="margin:0;font-size:13px;color:#6b7280;">${t.description}</p>` : ""}
         </div>
       `).join("")}`
    : "";

  // ── In Progress section ────────────────────────────────
  const inProgressSection = p.inProgressTasks.length > 0
    ? `<p style="margin:20px 0 12px;font-size:15px;color:#111827;"><strong>🚀 In Progress (Up Next This Week)</strong></p>
       ${p.inProgressTasks.map((t) => {
         const due = t.due_date
           ? new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
           : "";
         const progress = t.estimated_hours && t.hours_logged
           ? ` • ${Math.round((t.hours_logged / t.estimated_hours) * 100)}% time spent`
           : "";
         const blockerHTML = t.has_blocker && t.blocker_note
           ? `<div ${blockerStyle}>🚫 Blocker: ${t.blocker_note}</div>`
           : "";
         const latestCommentHTML = t.latest_comment
           ? `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;font-style:italic;">Latest update: "${t.latest_comment.content.substring(0, 80)}${t.latest_comment.content.length > 80 ? "..." : ""}"</p>`
           : "";

         return `
           <div ${taskStyle}>
             <p style="margin:0 0 4px;font-weight:600;color:#111827;">${t.title}${due ? ` • Due: ${due}` : ""}${progress}</p>
             ${t.description ? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${t.description}</p>` : ""}
             ${blockerHTML}
             ${latestCommentHTML}
           </div>
         `;
       }).join("")}`
    : "";

  // ── Awaiting section ───────────────────────────────────
  const awaitingSection = p.awaitingTasks.length > 0
    ? `<p style="margin:20px 0 12px;font-size:15px;color:#111827;"><strong>⏸️ Waiting on Your Feedback</strong></p>
       ${p.awaitingTasks.map((t) => {
         const latestCommentHTML = t.latest_comment
           ? `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;">${t.latest_comment.author}: "${t.latest_comment.content.substring(0, 100)}${t.latest_comment.content.length > 100 ? "..." : ""}"</p>`
           : "";
         return `
           <div ${taskStyle}>
             <p style="margin:0 0 4px;font-weight:600;color:#111827;">${t.title}</p>
             ${t.description ? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${t.description}</p>` : ""}
             ${latestCommentHTML}
           </div>
         `;
       }).join("")}`
    : `<p style="margin:20px 0 12px;font-size:15px;color:#111827;"><strong>⏸️ Waiting on Your Feedback</strong></p>
       <p style="font-size:14px;color:#374151;">All clear – no blockers at this time! ✅</p>`;

  const awaitingLabel = p.awaitingTasks.length > 0
    ? `<strong>${p.awaitingTasks.length}</strong> items waiting on you`
    : `<strong>0</strong> items waiting on you`;

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${p.projectName} – Weekly Update</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

      <!-- BODY -->
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Weekly Project Update · Week of ${dateRange}</p>
        <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827;">${p.projectName}</h1>

        <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${p.clientName},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;">Here's your project update for this week:</p>

        <div style="padding:16px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:4px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#0c4a6e;"><strong>Quick Summary:</strong></p>
          <p style="margin:4px 0 0;font-size:14px;color:#0c4a6e;">
            ${p.completedTasks.length} completed &nbsp;·&nbsp;
            ${p.inProgressTasks.length} in progress &nbsp;·&nbsp;
            ${awaitingLabel}
          </p>
        </div>

        ${completedSection}
        ${inProgressSection}
        ${awaitingSection}

        <div style="padding:16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-size:14px;color:#166534;"><strong>Project Health:</strong> ${healthText}</p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">

        <p style="margin:0 0 4px;font-size:14px;color:#374151;">Questions about any of the waiting items? Happy to jump on a quick call to discuss!</p>
        <p style="margin:12px 0 4px;font-size:14px;color:#374151;">Have a great week,</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${p.senderName}</p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;background:#f9fafb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sent via Donezy</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch project + client in parallel
    const [projectRes, userRes] = await Promise.all([
      supabase.from("projects").select("*, clients(*)").eq("id", project_id).single(),
      supabase.auth.getUser(),
    ]);

    if (projectRes.error || !projectRes.data) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const project = projectRes.data;

    // Get sender name
    let senderName = "Your Team";
    if (userRes.data?.user) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("name")
        .eq("auth_user_id", userRes.data.user.id)
        .maybeSingle();
      if (userProfile?.name) senderName = userProfile.name;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch tasks with full data
    const [completedRes, inProgressRes, awaitingRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("project_id", project_id)
        .eq("status", "done").gte("updated_at", oneWeekAgo.toISOString()),
      supabase.from("tasks").select("*").eq("project_id", project_id).eq("status", "in-progress"),
      supabase.from("tasks").select("*").eq("project_id", project_id)
        .in("status", ["review", "awaiting-feedback"]),
    ]);

    const completedTasks = completedRes.data ?? [];
    const inProgressTasks = inProgressRes.data ?? [];
    const awaitingTasks = awaitingRes.data ?? [];

    // Enrich tasks with comments, hours, blockers
    const enrichedCompleted = await Promise.all(
      completedTasks.map(t => enrichTaskWithContext(supabase, t, project_id))
    );
    const enrichedInProgress = await Promise.all(
      inProgressTasks.map(t => enrichTaskWithContext(supabase, t, project_id))
    );
    const enrichedAwaiting = await Promise.all(
      awaitingTasks.map(t => enrichTaskWithContext(supabase, t, project_id))
    );

    const projectHealth = enrichedAwaiting.length >= 3 ? "blocked"
      : enrichedAwaiting.length > 0 ? "attention-needed"
      : "on-track";

    const clientName = Array.isArray(project.clients)
      ? (project.clients[0]?.name ?? "there")
      : ((project.clients as any)?.name ?? "there");

    const htmlParams = {
      projectName: project.name,
      clientName,
      completedTasks: enrichedCompleted,
      inProgressTasks: enrichedInProgress,
      awaitingTasks: enrichedAwaiting,
      projectHealth,
      senderName,
    };

    const emailHtml = generateEmailHtml(htmlParams);

    const subject = `${project.name} – Weekly Update (Week of ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`;

    const stats = {
      completedCount: enrichedCompleted.length,
      inProgressCount: enrichedInProgress.length,
      awaitingCount: enrichedAwaiting.length,
      projectHealth,
      blockedTasksCount: enrichedInProgress.filter(t => t.has_blocker).length,
    };

    return new Response(
      JSON.stringify({ success: true, subject, emailHtml, stats }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in enhanced weekly roundup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
