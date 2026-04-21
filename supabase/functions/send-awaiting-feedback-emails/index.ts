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
  return { what: raw };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Apply {{variable}} substitution */
function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/** Convert plain-text template to HTML (preserve line breaks) */
function textToHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7;">${escapeHtml(text)}</div>`;
}

/** Default HTML email for a single awaiting-feedback task */
function buildDefaultHtml(
  userName: string,
  task: {
    title: string;
    project_name: string;
    awaiting_feedback_details: string;
    due_date: string | null;
    is_followup: boolean;
  }
): string {
  const feedback = parseFeedbackDetails(task.awaiting_feedback_details || "");
  const rows: string[] = [];
  if (feedback.what) rows.push(`<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;width:120px;">We're waiting on:</td><td style="padding:5px 0;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(feedback.what)}</td></tr>`);
  if (feedback.who)  rows.push(`<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">From:</td><td style="padding:5px 0;font-size:13px;color:#111827;">${escapeHtml(feedback.who)}</td></tr>`);
  if (feedback.why)  rows.push(`<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Impact:</td><td style="padding:5px 0;font-size:13px;color:#111827;">${escapeHtml(feedback.why)}</td></tr>`);
  if (feedback.when) rows.push(`<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Need by:</td><td style="padding:5px 0;font-size:13px;color:#111827;">${escapeHtml(feedback.when)}</td></tr>`);

  const badge = task.is_followup
    ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;margin-left:8px;">FOLLOW-UP</span>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;">
      <div style="background:#f97316;border-radius:8px 8px 0 0;padding:20px 24px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">
          ${task.is_followup ? "⏰ Follow-up: Awaiting Feedback" : "⏳ Awaiting Feedback"}
        </h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Hi ${escapeHtml(userName)},</p>
        <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#111827;">
          ${escapeHtml(task.title)}${badge}
        </p>
        <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">Project: ${escapeHtml(task.project_name)}</p>
        ${rows.length ? `<div style="padding:14px 16px;background:#fff7ed;border-left:3px solid #f97316;border-radius:4px;"><table style="border-collapse:collapse;width:100%;">${rows.join("")}</table></div>` : ""}
        ${task.due_date ? `<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Task due: ${task.due_date}</p>` : ""}
        <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">— The Donezy Team</p>
      </div>
    </div>`;
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

    // Load the custom template from DB (if admin has saved one)
    const { data: dbTemplate } = await supabase
      .from('email_templates')
      .select('subject, content, is_active')
      .eq('type', 'awaiting_feedback')
      .maybeSingle();

    const customTemplate = dbTemplate?.is_active ? dbTemplate : null;
    console.log(`Custom template: ${customTemplate ? 'loaded' : 'using default'}`);

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

    const allTasks = tasks || [];
    const followupTasksToday = allTasks.filter(t => t.awaiting_feedback_followup_date === todayStr);

    // Group daily digest tasks by owner
    const tasksByOwner: Record<string, typeof allTasks> = {};
    for (const task of allTasks) {
      const ownerId = task.auth_user_id;
      if (!tasksByOwner[ownerId]) tasksByOwner[ownerId] = [];
      tasksByOwner[ownerId].push(task);
    }

    // Group follow-up tasks by owner
    const followupByOwner: Record<string, typeof allTasks> = {};
    for (const task of followupTasksToday) {
      const ownerId = task.auth_user_id;
      if (!followupByOwner[ownerId]) followupByOwner[ownerId] = [];
      followupByOwner[ownerId].push(task);
    }

    let emailsSent = 0;

    // ── Daily digest ──────────────────────────────────────────────
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

      // Send one email per task so the template applies neatly per task
      for (const task of ownerTasks) {
        const feedback = parseFeedbackDetails(task.awaiting_feedback_details || "");
        const projectName = (task.project as any)?.name || 'Unknown Project';

        let subject: string;
        let html: string;

        if (customTemplate) {
          const vars: Record<string, string> = {
            user_name: ownerUser.name || '',
            task_title: task.title || '',
            project_name: projectName,
            feedback_what: feedback.what || '',
            feedback_who: feedback.who || '',
            feedback_why: feedback.why || '',
            feedback_when: feedback.when || task.due_date || '',
          };
          subject = applyVars(customTemplate.subject, vars);
          // Render plain-text template as HTML
          html = textToHtml(applyVars(customTemplate.content, vars));
        } else {
          subject = `Following up on ${task.title} – feedback needed`;
          html = buildDefaultHtml(ownerUser.name, {
            title: task.title,
            project_name: projectName,
            awaiting_feedback_details: task.awaiting_feedback_details || '',
            due_date: task.due_date,
            is_followup: false,
          });
        }

        const sent = await sendEmail(ownerUser.email, subject, html);
        if (sent) emailsSent++;
      }
    }

    // ── Targeted follow-up emails ──────────────────────────────────
    for (const [ownerId, ownerTasks] of Object.entries(followupByOwner)) {
      const { data: ownerUser, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_user_id', ownerId)
        .single();

      if (userError || !ownerUser?.email) continue;

      for (const task of ownerTasks) {
        const feedback = parseFeedbackDetails(task.awaiting_feedback_details || "");
        const projectName = (task.project as any)?.name || 'Unknown Project';

        let subject: string;
        let html: string;

        if (customTemplate) {
          const vars: Record<string, string> = {
            user_name: ownerUser.name || '',
            task_title: task.title || '',
            project_name: projectName,
            feedback_what: feedback.what || '',
            feedback_who: feedback.who || '',
            feedback_why: feedback.why || '',
            feedback_when: feedback.when || task.due_date || '',
          };
          subject = `[Follow-up] ${applyVars(customTemplate.subject, vars)}`;
          html = textToHtml(applyVars(customTemplate.content, vars));
        } else {
          subject = `Follow-up reminder: ${task.title} still awaiting feedback`;
          html = buildDefaultHtml(ownerUser.name, {
            title: task.title,
            project_name: projectName,
            awaiting_feedback_details: task.awaiting_feedback_details || '',
            due_date: task.due_date,
            is_followup: true,
          });
        }

        const sent = await sendEmail(ownerUser.email, subject, html);
        if (sent) emailsSent++;
      }
    }

    console.log(`Awaiting feedback email check complete. Emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        tasksFound: allTasks.length,
        followupTasksToday: followupTasksToday.length,
        usingCustomTemplate: !!customTemplate,
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
