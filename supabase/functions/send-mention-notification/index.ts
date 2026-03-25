import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

const defaultMentionTemplate = {
  subject: 'You were mentioned in: {{context_title}}',
  content: `Hello {{user_name}},

You have been mentioned by {{mention_by}} in {{context_type}} "{{context_title}}".

Message:
{{mention_message}}

Project: {{project_name}}

Please log in to view the full conversation and respond.

Best regards,
{{company_name}} Team`
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
      from: "Donezy <no-reply@donezy.io>",
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Processing mention notification request');
    
    const { mentionedUserId, mentionerName, messageContent, taskId, commentId, projectName } = await req.json();
    
    if (!mentionedUserId || !mentionerName || !messageContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: mentionedUser, error: userError } = await supabase
      .from('users')
      .select('name, email, auth_user_id')
      .eq('auth_user_id', mentionedUserId)
      .single();
    
    if (userError || !mentionedUser) {
      console.error('Error fetching mentioned user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: mentionerUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('name', mentionerName)
      .single();
    
    const fromUserId = mentionerUser?.auth_user_id || mentionedUserId;
    
    const plainText = messageContent.replace(/<[^>]*>/g, '').substring(0, 100);
    
    const { data: notification, error: notificationError } = await supabase
      .from('messages')
      .insert({
        from_user_id: fromUserId,
        to_user_id: mentionedUserId,
        subject: `You were mentioned by ${mentionerName}`,
        content: `You were mentioned in a comment: "${plainText}${plainText.length >= 100 ? '...' : ''}"`,
        priority: 'high',
        read: false,
        task_id: taskId || null,
        auth_user_id: fromUserId
      })
      .select()
      .single();
    
    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const template = await getEmailTemplate(supabase, 'mentioned', mentionedUserId);
    const isActive = template ? template.is_active : true;
    
    let emailSent = false;
    
    if (isActive) {
      const templateSubject = template?.subject || defaultMentionTemplate.subject;
      const templateContent = template?.content || defaultMentionTemplate.content;
      
      let taskTitle = 'a comment';
      if (taskId) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', taskId)
          .single();
        if (task) taskTitle = task.title;
      }
      
      const variables = {
        user_name: mentionedUser.name,
        mention_by: mentionerName,
        context_type: taskId ? 'task' : 'comment',
        context_title: taskTitle,
        mention_message: plainText,
        project_name: projectName || 'Unknown Project',
        company_name: 'Donezy'
      };
      
      const subject = processTemplate(templateSubject, variables);
      const content = processTemplate(templateContent, variables);
      
      emailSent = await sendEmail(mentionedUser.email, subject, content);
    } else {
      console.log('Mention email template is inactive - skipping email');
    }
    
    return new Response(
      JSON.stringify({ success: true, notificationId: notification.id, emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-mention-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
