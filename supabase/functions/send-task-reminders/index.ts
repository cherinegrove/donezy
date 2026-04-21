import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  content: string;
  is_active: boolean;
}

async function getEmailTemplate(supabase: any, templateType: string, authUserId: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('type', templateType)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching email template ${templateType}:`, error);
    return null;
  }

  return data;
}

function processTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

const defaultTemplates: Record<string, { subject: string; content: string }> = {
  task_due_today: {
    subject: 'Task Due Today: {{task_title}}',
    content: `Hello {{user_name}},

Your task "{{task_title}}" is due today.

Project: {{project_name}}
Priority: {{priority}}
Due Date: {{due_date}}

Description:
{{task_description}}

Please complete this task today to stay on track.

Best regards,
{{company_name}} Team`
  },
  task_reminder: {
    subject: 'Task Reminder: {{task_title}}',
    content: `Hello {{user_name}},

This is a reminder about your upcoming task:

Task: {{task_title}}
Project: {{project_name}}
Due Date: {{due_date}}
Priority: {{priority}}

Please make sure to complete this task on time.

Best regards,
{{company_name}} Team`
  },
};

async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; padding: 20px; border-radius: 5px;">
            <div style="color: #333; line-height: 1.6; white-space: pre-line;">
              ${content.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error(`Resend error sending to ${to}:`, error);
      return false;
    }

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting task reminder check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('Checking for task reminders on:', todayStr);
    
    const { data: dueTasks, error: dueTasksError } = await supabase
      .from('tasks')
      .select(`id, title, description, due_date, priority, auth_user_id, assignee_id, collaborator_ids, project:projects(name)`)
      .eq('due_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (dueTasksError) {
      console.error('Error fetching due tasks:', dueTasksError);
      throw dueTasksError;
    }
    
    console.log('Found', dueTasks?.length || 0, 'tasks due today');
    
    let emailsSent = 0;
    let notificationsSent = 0;
    
    for (const task of dueTasks || []) {
      const { data: existingReminder } = await supabase
        .from('task_reminders')
        .select('id')
        .eq('task_id', task.id)
        .eq('reminder_type', 'due_date')
        .single();
      
      if (existingReminder) {
        console.log(`Due date reminder already sent for task ${task.id}`);
        continue;
      }
      
      const template = await getEmailTemplate(supabase, 'task_due_today', task.auth_user_id);
      const isActive = template ? template.is_active : true;
      
      if (!isActive) {
        console.log(`Task due today email template is inactive for user ${task.auth_user_id} - skipping email`);
        continue;
      }
      
      const templateSubject = template?.subject || defaultTemplates.task_due_today.subject;
      const templateContent = template?.content || defaultTemplates.task_due_today.content;
      
      const recipients: any[] = [];
      
      if (task.assignee_id) {
        const { data: assigneeUser } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .eq('auth_user_id', task.assignee_id)
          .single();
        if (assigneeUser) recipients.push(assigneeUser);
      }
      
      if (task.collaborator_ids && task.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', task.collaborator_ids);
        
        if (collaboratorUsers) {
          for (const collab of collaboratorUsers) {
            if (!recipients.find((r: any) => r.auth_user_id === collab.auth_user_id)) {
              recipients.push(collab);
            }
          }
        }
      }
      
      for (const recipient of recipients) {
        const variables = {
          user_name: recipient.name,
          task_title: task.title,
          project_name: (task.project as any)?.name || 'Unknown Project',
          due_date: task.due_date || 'No due date',
          priority: task.priority || 'medium',
          task_description: task.description || 'No description',
          company_name: 'Donezy'
        };
        
        const subject = processTemplate(templateSubject, variables);
        const content = processTemplate(templateContent, variables);
        
        const emailSent = await sendEmail(recipient.email, subject, content);
        if (emailSent) emailsSent++;
        
        const { data: recipientUser } = await supabase
          .from('users')
          .select('auth_user_id')
          .eq('email', recipient.email)
          .single();

        if (recipientUser) {
          await supabase.from('messages').insert({
            auth_user_id: recipientUser.auth_user_id,
            from_user_id: 'system',
            to_user_id: recipientUser.auth_user_id,
            subject: `Task Due Today: ${task.title}`,
            content: `The task "${task.title}" is due today.`,
            priority: 'high',
            read: false
          });
          notificationsSent++;
        }

        await supabase.from('task_reminders').insert({
          task_id: task.id,
          reminder_type: 'due_date',
          email_sent_to: recipient.email,
        });
      }
      
      console.log(`Processed due date reminders for task: ${task.title}`);
    }
    
    const { data: reminderTasks } = await supabase
      .from('tasks')
      .select(`id, title, description, reminder_date, due_date, priority, auth_user_id, assignee_id, collaborator_ids, project:projects(name)`)
      .eq('reminder_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    for (const task of reminderTasks || []) {
      const { data: existingReminder } = await supabase
        .from('task_reminders')
        .select('id')
        .eq('task_id', task.id)
        .eq('reminder_type', 'custom_reminder')
        .single();
      
      if (existingReminder) continue;
      
      const template = await getEmailTemplate(supabase, 'task_reminder', task.auth_user_id);
      const isActive = template ? template.is_active : true;
      if (!isActive) continue;
      
      const templateSubject = template?.subject || defaultTemplates.task_reminder.subject;
      const templateContent = template?.content || defaultTemplates.task_reminder.content;
      
      const recipients: any[] = [];
      
      if (task.assignee_id) {
        const { data: assigneeUser } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .eq('auth_user_id', task.assignee_id)
          .single();
        if (assigneeUser) recipients.push(assigneeUser);
      }
      
      for (const recipient of recipients) {
        const variables = {
          user_name: recipient.name,
          task_title: task.title,
          project_name: (task.project as any)?.name || 'Unknown Project',
          due_date: task.due_date || 'No due date',
          priority: task.priority || 'medium',
          task_description: task.description || 'No description',
          company_name: 'Donezy'
        };
        
        const subject = processTemplate(templateSubject, variables);
        const content = processTemplate(templateContent, variables);
        
        const emailSent = await sendEmail(recipient.email, subject, content);
        if (emailSent) emailsSent++;
        
        await supabase.from('task_reminders').insert({
          task_id: task.id,
          reminder_type: 'custom_reminder',
          email_sent_to: recipient.email,
        });
      }
    }
    
    console.log(`Task reminder check complete. Emails sent: ${emailsSent}, In-app notifications: ${notificationsSent}`);
    
    return new Response(
      JSON.stringify({ success: true, emailsSent, notificationsSent, dueTasksChecked: dueTasks?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error in send-task-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
