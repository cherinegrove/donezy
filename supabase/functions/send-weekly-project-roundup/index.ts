import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseAwaitingDetails(raw: string | null): { what: string; who: string; why: string; when: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* fall through */ }
  return { what: raw, who: "", why: "", when: "" };
}

function determineHealth(awaitingCount: number): "on-track" | "attention-needed" | "blocked" {
  if (awaitingCount >= 3) return "blocked";
  if (awaitingCount > 0) return "attention-needed";
  return "on-track";
}

function generateEmailHtml(p: {
  projectName: string;
  clientName: string;
  completedTasks: any[];
  inProgressTasks: any[];
  awaitingTasks: any[];
  portalLink: string | null;
  projectHealth: string;
  senderName: string;
}): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const dateRange = `${fmt(weekStart)} – ${fmt(now)} ${now.getFullYear()}`;

  const healthEmoji = p.projectHealth === "on-track" ? "🟢" : p.projectHealth === "blocked" ? "🔴" : "🟡";
  const healthText =
    p.projectHealth === "on-track"
      ? "On Track – great progress this week!"
      : p.projectHealth === "blocked"
      ? "Blocked – multiple items need your input"
      : "Needs Attention – some items are waiting on you";

  // ── Completed section ──────────────────────────────────
  let completedRows = "";
  if (p.completedTasks.length > 0) {
    completedRows = p.completedTasks
      .map(
        (t) => `<tr><td style="padding:4px 0 4px 12px;font-size:14px;color:#166534;">
          • <strong>${t.title}</strong></td></tr>`
      )
      .join("");
  }
  const completedSection =
    p.completedTasks.length > 0
      ? `<tr><td style="padding:20px 0 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#166534;letter-spacing:0.5px;text-transform:uppercase;">✅ Completed This Week</p>
              <table width="100%" cellpadding="0" cellspacing="0">${completedRows}</table>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  // ── In Progress section ────────────────────────────────
  const inProgressRows = p.inProgressTasks
    .map((t) => {
      const due = t.due_date
        ? `<span style="color:#6b7280;font-size:13px;"> — Expected: ${new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>`
        : "";
      return `<tr><td style="padding:4px 0 4px 12px;font-size:14px;color:#1d4ed8;">• <strong>${t.title}</strong>${due}</td></tr>`;
    })
    .join("");
  const inProgressSection =
    p.inProgressTasks.length > 0
      ? `<tr><td style="padding:12px 0 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#1d4ed8;letter-spacing:0.5px;text-transform:uppercase;">🚀 In Progress (Up Next This Week)</p>
              <table width="100%" cellpadding="0" cellspacing="0">${inProgressRows}</table>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  // ── Awaiting section ───────────────────────────────────
  let awaitingContent = "";
  if (p.awaitingTasks.length === 0) {
    awaitingContent = `<p style="margin:6px 0 0;font-size:14px;color:#15803d;font-weight:600;">✅ All clear – no blockers at this time!</p>`;
  } else {
    awaitingContent = p.awaitingTasks
      .map((t) => {
        const d = parseAwaitingDetails(t.awaiting_feedback_details);
        const detailRows = d
          ? [
              d.what ? `<tr><td style="padding:2px 0;font-size:13px;color:#6b7280;">→ <strong>What we need:</strong> ${d.what}</td></tr>` : "",
              d.who ? `<tr><td style="padding:2px 0;font-size:13px;color:#6b7280;">→ <strong>From:</strong> ${d.who}</td></tr>` : "",
              d.when ? `<tr><td style="padding:2px 0;font-size:13px;color:#6b7280;">→ <strong>Needed by:</strong> ${d.when}</td></tr>` : "",
              d.why ? `<tr><td style="padding:2px 0;font-size:13px;color:#6b7280;">→ <strong>Why it matters:</strong> ${d.why}</td></tr>` : "",
            ].join("")
          : "";
        return `<tr><td style="padding:8px 0 14px;border-bottom:1px solid #fed7aa;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 0 5px;font-size:14px;color:#9a3412;font-weight:700;">• ${t.title}</td></tr>
              ${detailRows}
            </table>
          </td></tr>`;
      })
      .join("");
  }
  const awaitingBg = p.awaitingTasks.length === 0 ? "#f0fdf4" : "#fff7ed";
  const awaitingBorder = p.awaitingTasks.length === 0 ? "#22c55e" : "#f97316";
  const awaitingTitleColor = p.awaitingTasks.length === 0 ? "#166534" : "#9a3412";
  const awaitingSection = `<tr><td style="padding:12px 0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${awaitingBg};border-left:4px solid ${awaitingBorder};border-radius:6px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:${awaitingTitleColor};letter-spacing:0.5px;text-transform:uppercase;">⏸️ Waiting on Your Feedback</p>
          <table width="100%" cellpadding="0" cellspacing="0">${awaitingContent}</table>
        </td></tr>
      </table>
    </td></tr>`;

  // ── Portal link ────────────────────────────────────────
  const portalSection = p.portalLink
    ? `<tr><td style="padding:16px 0 8px;text-align:center;">
        <a href="${p.portalLink}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">💼 View Time Tracking Portal</a>
      </td></tr>`
    : "";

  const awaitingLabel = p.awaitingTasks.length > 0
    ? `<strong style="color:#f97316;">${p.awaitingTasks.length}</strong> waiting on you`
    : `<strong style="color:#22c55e;">0</strong> waiting on you`;

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${p.projectName} – Weekly Update</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;">
        <p style="margin:0;color:#94a3b8;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Weekly Project Update</p>
        <h1 style="margin:6px 0 0;color:white;font-size:22px;font-weight:700;">${p.projectName}</h1>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Week of ${dateRange}</p>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:24px 32px;">
        <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi ${p.clientName},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;">Here's your weekly project update:</p>

        <!-- QUICK SUMMARY -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:4px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">📊 Quick Summary</p>
            <p style="margin:0;font-size:14px;color:#374151;">
              <strong>${p.completedTasks.length}</strong> completed &nbsp;·&nbsp;
              <strong>${p.inProgressTasks.length}</strong> in progress &nbsp;·&nbsp;
              ${awaitingLabel}
            </p>
          </td></tr>
        </table>

        <!-- TASK SECTIONS -->
        <table width="100%" cellpadding="0" cellspacing="0">
          ${completedSection}
          ${inProgressSection}
          ${awaitingSection}

          <!-- PROJECT HEALTH -->
          <tr><td style="padding:12px 0 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">📈 Project Health</p>
                <p style="margin:0;font-size:14px;color:#374151;">${healthEmoji} ${healthText}</p>
              </td></tr>
            </table>
          </td></tr>

          ${portalSection}

          <!-- SIGN OFF -->
          <tr><td style="padding:24px 0 0;border-top:1px solid #e2e8f0;margin-top:8px;">
            <p style="margin:0;font-size:14px;color:#374151;">Let me know if you have any questions about the waiting items — happy to jump on a quick call to discuss!</p>
            <p style="margin:14px 0 4px;font-size:14px;color:#374151;">Have a great weekend,</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#374151;">${p.senderName}</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Sent via Donezy</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function generatePlainText(p: {
  projectName: string;
  clientName: string;
  completedTasks: any[];
  inProgressTasks: any[];
  awaitingTasks: any[];
  senderName: string;
}): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const dateRange = `${weekStart.toLocaleDateString("en-GB")} – ${now.toLocaleDateString("en-GB")}`;

  let text = `Hi ${p.clientName},\n\nHere's your weekly update for ${p.projectName} (Week of ${dateRange}):\n`;
  text += `\n📊 QUICK SUMMARY: ${p.completedTasks.length} completed | ${p.inProgressTasks.length} in progress | ${p.awaitingTasks.length} waiting on you\n`;

  if (p.completedTasks.length > 0) {
    text += `\n✅ COMPLETED THIS WEEK:\n`;
    p.completedTasks.forEach((t) => { text += `• ${t.title}\n`; });
  }

  if (p.inProgressTasks.length > 0) {
    text += `\n🚀 IN PROGRESS:\n`;
    p.inProgressTasks.forEach((t) => {
      const due = t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleDateString("en-GB")})` : "";
      text += `• ${t.title}${due}\n`;
    });
  }

  text += `\n⏸️ WAITING ON YOUR FEEDBACK:\n`;
  if (p.awaitingTasks.length === 0) {
    text += `✅ All clear – no blockers at this time!\n`;
  } else {
    p.awaitingTasks.forEach((t) => {
      const d = parseAwaitingDetails(t.awaiting_feedback_details);
      text += `• ${t.title}\n`;
      if (d) {
        if (d.what) text += `  → What we need: ${d.what}\n`;
        if (d.who) text += `  → From: ${d.who}\n`;
        if (d.when) text += `  → Needed by: ${d.when}\n`;
        if (d.why) text += `  → Why it matters: ${d.why}\n`;
      }
    });
  }

  text += `\nLet me know if you have any questions. Happy to jump on a quick call!\n\nHave a great weekend,\n${p.senderName}`;
  return text;
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

    // Fetch project + client portal in parallel
    const [projectRes, portalRes, userRes] = await Promise.all([
      supabase.from("projects").select("*, clients(*)").eq("id", project_id).single(),
      supabase.from("client_portals").select("token").eq("project_id", project_id).eq("is_active", true).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (projectRes.error || !projectRes.data) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const project = projectRes.data;

    // Get sender name from users table
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

    // Fetch all task categories
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

    const projectHealth = determineHealth(awaitingTasks.length);

    const appUrl = Deno.env.get("APP_URL") ?? "https://donezy.lovable.app";
    const portalLink = portalRes.data?.token ? `${appUrl}/client/${portalRes.data.token}` : null;

    const clientName = Array.isArray(project.clients)
      ? (project.clients[0]?.name ?? "there")
      : ((project.clients as any)?.name ?? "there");

    const htmlParams = {
      projectName: project.name,
      clientName,
      completedTasks,
      inProgressTasks,
      awaitingTasks,
      portalLink,
      projectHealth,
      senderName,
    };

    const emailHtml = generateEmailHtml(htmlParams);
    const emailContent = generatePlainText({ ...htmlParams, awaitingTasks });

    const subject = `${project.name} – Weekly Update (Week of ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`;

    const stats = {
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      awaitingCount: awaitingTasks.length,
      projectHealth,
      // backward compat
      backlogCount: 0,
      awaitingFeedbackCount: awaitingTasks.length,
      completedThisWeek: completedTasks.length,
      addedThisWeek: 0,
    };

    return new Response(
      JSON.stringify({ success: true, subject, emailContent, emailHtml, stats }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-project-roundup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
