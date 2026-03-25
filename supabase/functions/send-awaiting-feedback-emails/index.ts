import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured - skipping email send");
    return false;
  }
  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: "Donezy <noreply@donezy.io>",
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error(`Resend error sending to ${to}:`, error);
      return false;
    }
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error(`Error sending email to ${to}:`, err);
    return false;
  }
}

interface FeedbackDetails {
  what?: string;
  who?: string;
  why?: string;
  when?: string;
}

function parseFeedbackDetails(raw: string): FeedbackDetails {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "what" in parsed) return parsed;
  } catch {}
  // Legacy plain-text fallback
  return { what: raw };
}

function buildFeedbackBlock(details: FeedbackDetails): string {
  const rows: string[] = [];
  if (details.what) rows.push(`<tr><td style="padding:4px 0; font-size:13px; color:#6b7280; width:110px;">Waiting on:</td><td style="padding:4px 0; font-size:13px; color:#111827; font-weight:500;">${escapeHtml(details.what)}</td></tr>`);
  if (details.who)  rows.push(`<tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">From:</td><td style="padding:4px 0; font-size:13px; color:#111827;">${escapeHtml(details.who)}</td></tr>`);
  if (details.why)  rows.push(`<tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">Impact:</td><td style="padding:4px 0; font-size:13px; color:#111827;">${escapeHtml(details.why)}</td></tr>`);
  if (details.when) rows.push(`<tr><td style="padding:4px 0; font-size:13px; color:#6b7280;">Need by:</td><td style="padding:4px 0; font-size:13px; color:#111827;">${escapeHtml(details.when)}</td></tr>`);
  if (!rows.length) return "";
  return `<table style="border-collapse:collapse; width:100%;">${rows.join("")}</table>`;
}

function buildEmailHtml(
  userName: string,
  tasks: Array<{
    title: string;
    project_name: string;
    awaiting_feedback_details: string;
    due_date: string | null;
    followup_date: string | null;
    is_followup: boolean;
  }>,
  isFollowUp: boolean
): string {
  const taskRows = tasks.map(task => {
    const feedback = parseFeedbackDetails(task.awaiting_feedback_details || "");
    const feedbackBlock = buildFeedbackBlock(feedback);
    const followupBadge = task.is_followup
      ? `<span style="display:inline-block; background:#fef3c7; color:#92400e; font-size:11px; font-weight:600; padding:2px 8px; border-radius:99px; margin-left:8px;">FOLLOW-UP</span>`
      : "";
    return `
      <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin-bottom:16px; background:#fafafa;">
        <p style="margin:0 0 4px 0; font-size:16px; font-weight:600; color:#111827;">
          ${escapeHtml(task.title)}${followupBadge}
        </p>
        <p style="margin:0 0 12px 0; font-size:13px; color:#6b7280;">Project: ${escapeHtml(task.project_name)}</p>
        ${feedbackBlock
          ? `<div style="margin-top:8px; padding:12px 14px; background:#fff7ed; border-left:3px solid #f97316; border-radius:4px;">
              ${feedbackBlock}
            </div>`
          : ""
        }
        ${task.due_date ? `<p style="margin:8px 0 0 0; font-size:12px; color:#9ca3af;">Task due: ${task.due_date}</p>` : ""}
      </div>
    `;
  }).join("");

  const headingText = isFollowUp
    ? "⏰ Follow-up: Tasks Still Awaiting Feedback"
    : "⏳ Tasks Awaiting Feedback";

  const introText = isFollowUp
    ? `You requested a follow-up reminder for <strong>${tasks.length} task${tasks.length === 1 ? "" : "s"}</strong> still awaiting a response. Here's the current status:`
    : `You have <strong>${tasks.length} task${tasks.length === 1 ? "" : "s"}</strong> with pending feedback. Here's a summary of what's waiting:`;

  return `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; background:#ffffff;">
      <div style="background:#f97316; border-radius:8px 8px 0 0; padding:24px 28px;">
        <h1 style="margin:0; color:#ffffff; font-size:22px;">${headingText}</h1>
      </div>
      <div style="border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px; padding:24px 28px;">
        <p style="margin:0 0 20px 0; font-size:15px; color:#374151;">Hi ${escapeHtml(userName)},</p>
        <p style="margin:0 0 24px 0; font-size:14px; color:#6b7280;">${introText}</p>
        ${taskRows}
        <p style="margin:24px 0 0 0; font-size:13px; color:#9ca3af;">
          Please follow up on these items to keep your projects moving forward.
        </p>
        <p style="margin:8px 0 0 0; font-size:13px; color:#9ca3af;">— The Donezy Team</p>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting awaiting feedback email check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch all open tasks with awaiting_feedback_details
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        awaiting_feedback_details,
        awaiting_feedback_followup_date,
        due_date,
        status,
        auth_user_id,
        assignee_id,
        project:projects(name)
      `)
      .not('awaiting_feedback_details', 'is', null)
      .neq('awaiting_feedback_details', '')
      .not('status', 'in', '("done","completed","cancelled")');

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} tasks with awaiting feedback details`);

    // Separate daily digest tasks vs follow-up tasks due today
    const digestTasks = tasks || [];
    const followupTasksToday = digestTasks.filter(t => t.awaiting_feedback_followup_date === todayStr);

    // Group all tasks by owner for daily digest
    const tasksByOwner: Record<string, typeof digestTasks> = {};
    for (const task of digestTasks) {
      const ownerId = task.auth_user_id;
      if (!tasksByOwner[ownerId]) tasksByOwner[ownerId] = [];
      tasksByOwner[ownerId].push(task);
    }

    // Group follow-up tasks by owner
    const followupByOwner: Record<string, typeof digestTasks> = {};
    for (const task of followupTasksToday) {
      const ownerId = task.auth_user_id;
      if (!followupByOwner[ownerId]) followupByOwner[ownerId] = [];
      followupByOwner[ownerId].push(task);
    }

    let emailsSent = 0;

    // Send daily digest
    for (const [ownerId, ownerTasks] of Object.entries(tasksByOwner)) {
      const { data: ownerUser, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_user_id', ownerId)
        .single();

      if (userError || !ownerUser?.email) {
        console.log(`Could not find user for owner ${ownerId}, skipping`);
        continue;
      }

      const formattedTasks = ownerTasks.map(t => ({
        title: t.title,
        project_name: (t.project as any)?.name || 'Unknown Project',
        awaiting_feedback_details: t.awaiting_feedback_details || '',
        due_date: t.due_date,
        followup_date: t.awaiting_feedback_followup_date,
        is_followup: false,
      }));

      const subject = `${ownerTasks.length} task${ownerTasks.length === 1 ? '' : 's'} awaiting feedback`;
      const html = buildEmailHtml(ownerUser.name, formattedTasks, false);

      const sent = await sendEmail(ownerUser.email, subject, html);
      if (sent) emailsSent++;
    }

    // Send targeted follow-up emails
    for (const [ownerId, ownerTasks] of Object.entries(followupByOwner)) {
      // Already sent in digest above – send a separate follow-up email too
      const { data: ownerUser, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_user_id', ownerId)
        .single();

      if (userError || !ownerUser?.email) continue;

      const formattedTasks = ownerTasks.map(t => ({
        title: t.title,
        project_name: (t.project as any)?.name || 'Unknown Project',
        awaiting_feedback_details: t.awaiting_feedback_details || '',
        due_date: t.due_date,
        followup_date: t.awaiting_feedback_followup_date,
        is_followup: true,
      }));

      const subject = `Follow-up reminder: ${ownerTasks.length} task${ownerTasks.length === 1 ? '' : 's'} still awaiting feedback`;
      const html = buildEmailHtml(ownerUser.name, formattedTasks, true);

      const sent = await sendEmail(ownerUser.email, subject, html);
      if (sent) emailsSent++;
    }

    console.log(`Awaiting feedback email check complete. Emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        tasksFound: tasks?.length || 0,
        followupTasksToday: followupTasksToday.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-awaiting-feedback-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
