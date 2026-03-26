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
  
  projectHealth: string;
  senderName: string;
}): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const dateRange = `${fmt(weekStart)} – ${fmt(now)} ${now.getFullYear()}`;

  const healthText =
    p.projectHealth === "on-track"
      ? "On Track – great progress this week!"
      : p.projectHealth === "blocked"
      ? "Blocked – multiple items need your input"
      : "Needs Attention – some items are waiting on you";

  const li = `style="line-height:1.15;margin:0 0 6px 0;font-size:14px;color:#374151;"`;

  // ── Completed section ──────────────────────────────────
  const completedSection = p.completedTasks.length > 0
    ? `<p style="margin:20px 0 6px;font-size:15px;color:#111827;"><strong>Completed This Week</strong></p>
       <ul style="margin:0 0 0 18px;padding:0;">
         ${p.completedTasks.map((t) => `<li ${li}>• ${t.title}</li>`).join("")}
       </ul>`
    : "";

  // ── In Progress section ────────────────────────────────
  const inProgressSection = p.inProgressTasks.length > 0
    ? `<p style="margin:20px 0 6px;font-size:15px;color:#111827;"><strong>In Progress (Up Next This Week)</strong></p>
       <ul style="margin:0 0 0 18px;padding:0;">
         ${p.inProgressTasks.map((t) => {
           const due = t.due_date
             ? ` – Expected: ${new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
             : "";
           return `<li ${li}>• ${t.title}${due}</li>`;
         }).join("")}
       </ul>`
    : "";

  // ── Awaiting section ───────────────────────────────────
  let awaitingItems = "";
  if (p.awaitingTasks.length === 0) {
    awaitingItems = `<p style="margin:4px 0 0;font-size:14px;color:#374151;">All clear – no blockers at this time!</p>`;
  } else {
    awaitingItems = p.awaitingTasks.map((t) => {
      const d = parseAwaitingDetails(t.awaiting_feedback_details);
      const details = d ? [
        d.what ? `<p style="margin:2px 0 2px 16px;font-size:13px;color:#374151;">→ <strong>What we need:</strong> ${d.what}</p>` : "",
        d.who  ? `<p style="margin:2px 0 2px 16px;font-size:13px;color:#374151;">→ <strong>From:</strong> ${d.who}</p>` : "",
        d.when ? `<p style="margin:2px 0 2px 16px;font-size:13px;color:#374151;">→ <strong>Needed by:</strong> ${d.when}</p>` : "",
        d.why  ? `<p style="margin:2px 0 10px 16px;font-size:13px;color:#374151;">→ <strong>Why it matters:</strong> ${d.why}</p>` : "",
      ].join("") : "";
      return `<p style="margin:0 0 4px 0;font-size:14px;color:#111827;"><strong>• ${t.title}</strong></p>${details}`;
    }).join("");
  }
  const awaitingSection = `<p style="margin:20px 0 6px;font-size:15px;color:#111827;"><strong>Waiting on Your Feedback</strong></p>${awaitingItems}`;


  const awaitingLabel = p.awaitingTasks.length > 0
    ? `<strong>${p.awaitingTasks.length}</strong> waiting on you`
    : `<strong>0</strong> waiting on you`;

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${p.projectName} – Weekly Update</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;">

      <!-- BODY -->
      <tr><td style="padding:24px 32px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Weekly Project Update · Week of ${dateRange}</p>
        <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#111827;">${p.projectName}</h1>

        <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi ${p.clientName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Here's your weekly project update:</p>

        <p style="margin:0 0 20px;font-size:14px;color:#374151;">
          <strong>Quick Summary:</strong>
          ${p.completedTasks.length} completed &nbsp;·&nbsp;
          ${p.inProgressTasks.length} in progress &nbsp;·&nbsp;
          ${awaitingLabel}
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 4px;">

        ${completedSection}
        ${inProgressSection}
        ${awaitingSection}

        <p style="margin:20px 0 6px;font-size:15px;color:#111827;"><strong>Project Health</strong></p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;">${healthText}</p>

        

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">

        <p style="margin:0 0 4px;font-size:14px;color:#374151;">Let me know if you have any questions about the waiting items — happy to jump on a quick call to discuss!</p>
        <p style="margin:12px 0 4px;font-size:14px;color:#374151;">Have a great weekend,</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${p.senderName}</p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:12px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sent via Donezy</p>
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
