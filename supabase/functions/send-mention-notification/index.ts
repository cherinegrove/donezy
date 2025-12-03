import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

// Helper function to get email template from database
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

// Helper function to replace template variables
function processTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

// Default template for mentions
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

// Send email using SMTP
async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("SMTP configuration is incomplete - skipping email send");
    return false;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: 587,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: smtpFrom,
      to: to,
      subject: subject,
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

    await client.close();
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
    
    // Get the mentioned user's details
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
    
    // Get the mentioner's user details
    const { data: mentionerUser, error: mentionerError } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('name', mentionerName)
      .single();
    
    const fromUserId = mentionerUser?.auth_user_id || mentionedUserId;
    
    // Create a notification message for the mentioned user
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
    
    // Check for email template - use mentioned user's auth_user_id to find their account owner's template
    const template = await getEmailTemplate(supabase, 'mentioned', mentionedUserId);
    const isActive = template ? template.is_active : true;
    
    let emailSent = false;
    
    if (isActive) {
      const templateSubject = template?.subject || defaultMentionTemplate.subject;
      const templateContent = template?.content || defaultMentionTemplate.content;
      
      // Get task title if available
      let taskTitle = 'a comment';
      if (taskId) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', taskId)
          .single();
        if (task) {
          taskTitle = task.title;
        }
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
    
    console.log(`Created mention notification for user ${mentionedUser.name}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationId: notification.id,
        emailSent
      }),
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
