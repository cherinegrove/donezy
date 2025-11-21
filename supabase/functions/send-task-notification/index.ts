import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleChatConfig {
  enabled: boolean;
  webhook_url: string;
  notifications: {
    task_created: {
      enabled: boolean;
      message_template: string;
    };
    task_completed: {
      enabled: boolean;
      message_template: string;
    };
    task_updated: {
      enabled: boolean;
      message_template: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, projectId, eventType, oldTask } = await req.json();
    
    console.log(`Processing ${eventType} notification for task ${taskId} in project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project with Google Chat settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('google_chat_settings, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.log('Project not found or error:', projectError);
      return new Response(
        JSON.stringify({ success: false, message: 'Project not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = project.google_chat_settings as GoogleChatConfig;

    // Check if Google Chat is enabled and configured
    if (!config?.enabled || !config?.webhook_url) {
      console.log('Google Chat not enabled for this project');
      return new Response(
        JSON.stringify({ success: false, message: 'Google Chat not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this specific notification type is enabled
    const notificationConfig = config.notifications?.[eventType];
    if (!notificationConfig?.enabled) {
      console.log(`${eventType} notifications not enabled`);
      return new Response(
        JSON.stringify({ success: false, message: `${eventType} notifications not enabled` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, project:projects(name)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.log('Task not found or error:', taskError);
      return new Response(
        JSON.stringify({ success: false, message: 'Task not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get assignee details if assigned
    let assigneeName = 'Unassigned';
    if (task.assignee_id) {
      const { data: assignee } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', task.assignee_id)
        .single();
      
      if (assignee) {
        assigneeName = assignee.name;
      }
    }

    // Build message from template
    let message = notificationConfig.message_template || getDefaultTemplate(eventType);
    
    // Replace placeholders
    message = message
      .replace('{task_title}', task.title || 'Untitled')
      .replace('{project_name}', project.name || 'Unknown Project')
      .replace('{assignee}', assigneeName)
      .replace('{priority}', task.priority || 'medium')
      .replace('{status}', task.status || 'backlog')
      .replace('{due_date}', task.due_date || 'No due date');

    console.log('Sending message to Google Chat:', message);

    // Send to Google Chat
    const chatResponse = await fetch(config.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Google Chat API error:', chatResponse.status, errorText);
      throw new Error(`Google Chat API error: ${chatResponse.status}`);
    }

    console.log('Notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-task-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getDefaultTemplate(eventType: string): string {
  const templates: Record<string, string> = {
    task_created: '🆕 *New Task Created*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Assigned to:* {assignee}\n*Priority:* {priority}',
    task_completed: '✅ *Task Completed*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Completed by:* {assignee}',
    task_updated: '✏️ *Task Updated*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Status:* {status}\n*Priority:* {priority}',
  };
  
  return templates[eventType] || 'Task notification: {task_title}';
}
