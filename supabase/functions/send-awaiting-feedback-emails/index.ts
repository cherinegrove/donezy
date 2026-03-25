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
      from: "Donezy <no-reply@donezy.io>",
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

function buildEmailHtml(userName: string, tasks: Array<{ title: string; project_name: string; awaiting_feedback_details: string; due_date: string | null }>): string {
  const taskRows = tasks.map(task => `
    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin-bottom:16px; background:#fafafa;">
      <p style="margin:0 0 6px 0; font-size:16px; font-weight:600; color:#111827;">${escapeHtml(task.title)}</p>
      <p style="margin:0 0 4px 0; font-size:13px; color:#6b7280;">Project: ${escapeHtml(task.project_name)}</p>
      ${task.due_date ? `<p style="margin:0 0 4px 0; font-size:13px; color:#6b7280;">Due: ${task.due_date}</p>` : ''}
      <div style="margin-top:10px; padding:12px; background:#fff7ed; border-left:3px solid #f97316; border-radius:4px;">
        <p style="margin:0 0 4px 0; font-size:12px; font-weight:600; color:#f97316; text-transform:uppercase; letter-spacing:0.05em;">Awaiting Feedback Details:</p>
        <p style="margin:0; font-size:14px; color:#374151; line-height:1.6;">${escapeHtml(task.awaiting_feedback_details)}</p>
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; background:#ffffff;">
      <div style="background:#f97316; border-radius:8px 8px 0 0; padding:24px 28px;">
        <h1 style="margin:0; color:#ffffff; font-size:22px;">⏳ Tasks Awaiting Feedback</h1>
      </div>
      <div style="border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px; padding:24px 28px;">
        <p style="margin:0 0 20px 0; font-size:15px; color:#374151;">Hi ${escapeHtml(userName)},</p>
        <p style="margin:0 0 24px 0; font-size:14px; color:#6b7280;">
          You have <strong>${tasks.length} task${tasks.length === 1 ? '' : 's'}</strong> with pending feedback. Here's a summary of what's waiting:
        </p>
        ${taskRows}
        <p style="margin:24px 0 0 0; font-size:13px; color:#9ca3af;">
          Please follow up on these items to keep your projects moving forward.
        </p>
        <p style="margin:8px 0 0 0; font-size:13px; color:#9ca3af;">
          — The Donezy Team
        </p>
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

    // Fetch all tasks that have awaiting_feedback_details filled in
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        awaiting_feedback_details,
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

    // Group tasks by owner (auth_user_id)
    const tasksByOwner: Record<string, typeof tasks> = {};
    for (const task of tasks || []) {
      const ownerId = task.auth_user_id;
      if (!tasksByOwner[ownerId]) tasksByOwner[ownerId] = [];
      tasksByOwner[ownerId].push(task);
    }

    let emailsSent = 0;

    for (const [ownerId, ownerTasks] of Object.entries(tasksByOwner)) {
      // Get owner's email and name
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
      }));

      const subject = `${ownerTasks.length} task${ownerTasks.length === 1 ? '' : 's'} awaiting feedback`;
      const html = buildEmailHtml(ownerUser.name, formattedTasks);

      const sent = await sendEmail(ownerUser.email, subject, html);
      if (sent) emailsSent++;
    }

    console.log(`Awaiting feedback email check complete. Emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ success: true, emailsSent, tasksFound: tasks?.length || 0 }),
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
