import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationSetting {
  enabled: boolean;
  message_template: string;
}

interface GoogleChatConfig {
  enabled: boolean;
  webhook_url: string;
  notifications: {
    task_created: NotificationSetting;
    task_completed: NotificationSetting;
    task_updated: NotificationSetting;
    task_commented: NotificationSetting;
    status_changed: NotificationSetting;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      taskId, 
      projectId, 
      eventType, 
      oldTask, 
      userId, 
      commentContent,
      oldStatus,
      newStatus,
      changes 
    } = await req.json();
    
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

    // Get the user who made the change
    let changedByName = 'Someone';
    if (userId) {
      console.log('Looking up user name for userId:', userId);
      
      // Try users table first
      const { data: changedBy, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_user_id', userId)
        .single();
      
      if (changedBy && changedBy.name) {
        changedByName = changedBy.name;
        console.log('Found user name from users table:', changedByName);
      } else {
        // Fallback to profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', userId)
          .single();
        
        if (profile) {
          changedByName = profile.display_name || profile.email || 'Someone';
          console.log('Found user name from profiles table:', changedByName);
        } else {
          console.log('Could not find user name, using default. UserError:', userError);
        }
      }
    }
    
    console.log('Final changedByName:', changedByName);
    console.log('Comment content received:', commentContent);
    
    // Strip HTML tags from comment content
    const cleanComment = commentContent ? commentContent.replace(/<[^>]*>/g, '').trim() : '';

    // Build changes summary for task_updated
    let changesSummary = '';
    if (changes && typeof changes === 'object') {
      const changesList: string[] = [];
      for (const [field, value] of Object.entries(changes)) {
        if (field === 'status' && oldStatus && newStatus) {
          changesList.push(`Status: ${oldStatus} → ${newStatus}`);
        } else if (field === 'priority') {
          changesList.push(`Priority: ${value}`);
        } else if (field === 'assignee') {
          changesList.push(`Assignee: ${value}`);
        } else if (field === 'due_date') {
          changesList.push(`Due date: ${value}`);
        }
      }
      if (changesList.length > 0) {
        changesSummary = changesList.join('\n');
      }
    }

    // Build task URL - use APP_URL env var if set, otherwise fallback
    const appUrl = (Deno.env.get('APP_URL') || 'https://donezy.lovable.app').replace(/\/$/, '');
    const taskUrl = `${appUrl}/tasks/${taskId}`;

    // Build message from template
    let message = notificationConfig.message_template || getDefaultTemplate(eventType);
    
    // Replace placeholders
    message = message
      .replace(/{task_title}/g, task.title || 'Untitled')
      .replace(/{project_name}/g, project.name || 'Unknown Project')
      .replace(/{assignee}/g, assigneeName)
      .replace(/{priority}/g, task.priority || 'medium')
      .replace(/{status}/g, task.status || 'backlog')
      .replace(/{due_date}/g, task.due_date || 'No due date')
      .replace(/{changed_by}/g, changedByName)
      .replace(/{comment}/g, cleanComment)
      .replace(/{old_status}/g, oldStatus || '')
      .replace(/{new_status}/g, newStatus || task.status || '')
      .replace(/{changes}/g, changesSummary)
      .replace(/{task_link}/g, taskUrl);

    // Each task gets a stable threadKey so all its notifications live in one thread
    // and replies can be routed back to the correct task in Donezy.
    const threadKey = `task-${taskId}`;

    console.log('Sending message to Google Chat via google-chat-send:', message);

    // Route through google-chat-send so thread mappings are saved automatically
    const supabaseFunctionsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-chat-send`;
    const chatResponse = await fetch(supabaseFunctionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        webhookUrl: config.webhook_url,
        message,
        threadKey,
        taskId,
        projectId,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('google-chat-send error:', chatResponse.status, errorText);
      throw new Error(`google-chat-send error: ${chatResponse.status}`);
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
    task_created: '🆕 *New Task Created*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Created by:* {changed_by}\n*Assigned to:* {assignee}\n*Priority:* {priority}\n\n🔗 {task_link}',
    task_completed: '✅ *Task Completed*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Completed by:* {changed_by}\n\n🔗 {task_link}',
    task_updated: '✏️ *Task Updated*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Updated by:* {changed_by}\n*Changes:*\n{changes}\n\n🔗 {task_link}',
    task_commented: '💬 *New Comment*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Comment by:* {changed_by}\n*Comment:* {comment}\n\n🔗 {task_link}',
    status_changed: '🔄 *Status Changed*\n\n*Task:* {task_title}\n*Project:* {project_name}\n*Changed by:* {changed_by}\n*Status:* {old_status} → {new_status}\n\n🔗 {task_link}',
  };
  
  return templates[eventType] || 'Task notification: {task_title}\n\n🔗 {task_link}';
}
