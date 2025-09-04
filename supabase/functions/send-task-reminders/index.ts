import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookData {
  type: 'task_reminder';
  reminder_type: 'start_date' | 'due_date' | 'custom_reminder';
  task: {
    id: string;
    title: string;
    description: string;
    start_date?: string;
    due_date?: string;
    reminder_date?: string;
  };
  recipients: {
    name: string;
    email: string;
    role: 'assignee' | 'collaborator';
  }[];
  timestamp: string;
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
    
    // Find tasks starting today that haven't had start date reminders sent
    const { data: startTasks, error: startTasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        start_date,
        auth_user_id,
        assignee_id,
        collaborator_ids
      `)
      .eq('start_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (startTasksError) {
      console.error('Error fetching start date tasks:', startTasksError);
      throw startTasksError;
    }
    
    console.log('Found', startTasks?.length || 0, 'tasks starting today');
    
    // Find tasks due today that haven't had due date reminders sent
    const { data: dueTasks, error: dueTasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        auth_user_id,
        assignee_id,
        collaborator_ids
      `)
      .eq('due_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (dueTasksError) {
      console.error('Error fetching due tasks:', dueTasksError);
      throw dueTasksError;
    }
    
    console.log('Found', dueTasks?.length || 0, 'tasks due today');
    
    // Find tasks with custom reminders for today
    const { data: reminderTasks, error: reminderTasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        reminder_date,
        auth_user_id,
        assignee_id,
        collaborator_ids
      `)
      .eq('reminder_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (reminderTasksError) {
      console.error('Error fetching reminder tasks:', reminderTasksError);
      throw reminderTasksError;
    }
    
    console.log('Found', reminderTasks?.length || 0, 'tasks with custom reminders today');
    
    let emailsSent = 0;
    
    // Process start date reminders
    for (const task of startTasks || []) {
      // Check if we already sent a start date reminder for this task
      const { data: existingReminder } = await supabase
        .from('task_reminders')
        .select('id')
        .eq('task_id', task.id)
        .eq('reminder_type', 'start_date')
        .single();
      
      if (existingReminder) {
        console.log(`Start date reminder already sent for task ${task.id}`);
        continue;
      }
      
      // Get list of recipients (assignee + collaborators, excluding creator)
      const recipients = [];
      
      // Add assignee if exists and different from creator
      if (task.assignee_id && task.assignee_id !== task.auth_user_id) {
        const { data: assigneeUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('auth_user_id', task.assignee_id)
          .single();
        
        if (assigneeUser) {
          recipients.push(assigneeUser);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (task.collaborator_ids && task.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', task.collaborator_ids)
          .neq('auth_user_id', task.auth_user_id);
        
        if (collaboratorUsers) {
          recipients.push(...collaboratorUsers);
        }
      }
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'task_reminder',
          reminder_type: 'start_date',
          task: {
            id: task.id,
            title: task.title,
            description: task.description || '',
            start_date: task.start_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: task.assignee_id === recipient.auth_user_id ? 'assignee' : 'collaborator' as const
          })),
          timestamp: new Date().toISOString(),
        };

        try {
          // Send webhook to automation platform
          const webhookUrl = Deno.env.get('REMINDER_WEBHOOK_URL');
          if (webhookUrl) {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookData),
            });
            
            if (!response.ok) {
              console.error('Webhook failed:', response.status, response.statusText);
            } else {
              console.log(`Sent start date reminder webhook for task: ${task.title}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for task:', task.title);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('task_reminders')
              .insert({
                task_id: task.id,
                reminder_type: 'start_date',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send start date reminder webhook for task ${task.id}:`, error);
        }
      }
    }
    
    // Process due date reminders
    for (const task of dueTasks || []) {
      // Check if we already sent a due date reminder for this task
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
      
      // Get list of recipients (assignee + collaborators, excluding creator)
      const recipients = [];
      
      // Add assignee if exists and different from creator
      if (task.assignee_id && task.assignee_id !== task.auth_user_id) {
        const { data: assigneeUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('auth_user_id', task.assignee_id)
          .single();
        
        if (assigneeUser) {
          recipients.push(assigneeUser);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (task.collaborator_ids && task.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', task.collaborator_ids)
          .neq('auth_user_id', task.auth_user_id);
        
        if (collaboratorUsers) {
          recipients.push(...collaboratorUsers);
        }
      }
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'task_reminder',
          reminder_type: 'due_date',
          task: {
            id: task.id,
            title: task.title,
            description: task.description || '',
            due_date: task.due_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: task.assignee_id === recipient.auth_user_id ? 'assignee' : 'collaborator' as const
          })),
          timestamp: new Date().toISOString(),
        };

        try {
          // Send webhook to automation platform
          const webhookUrl = Deno.env.get('REMINDER_WEBHOOK_URL');
          if (webhookUrl) {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookData),
            });
            
            if (!response.ok) {
              console.error('Webhook failed:', response.status, response.statusText);
            } else {
              console.log(`Sent due date reminder webhook for task: ${task.title}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for task:', task.title);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('task_reminders')
              .insert({
                task_id: task.id,
                reminder_type: 'due_date',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send due date reminder webhook for task ${task.id}:`, error);
        }
      }
    }
    
    // Process custom reminders
    for (const task of reminderTasks || []) {
      // Check if we already sent a custom reminder for this task
      const { data: existingReminder } = await supabase
        .from('task_reminders')
        .select('id')
        .eq('task_id', task.id)
        .eq('reminder_type', 'custom_reminder')
        .single();
      
      if (existingReminder) {
        console.log(`Custom reminder already sent for task ${task.id}`);
        continue;
      }
      
      // Get list of recipients (assignee + collaborators, excluding creator)
      const recipients = [];
      
      // Add assignee if exists and different from creator
      if (task.assignee_id && task.assignee_id !== task.auth_user_id) {
        const { data: assigneeUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('auth_user_id', task.assignee_id)
          .single();
        
        if (assigneeUser) {
          recipients.push(assigneeUser);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (task.collaborator_ids && task.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', task.collaborator_ids)
          .neq('auth_user_id', task.auth_user_id);
        
        if (collaboratorUsers) {
          recipients.push(...collaboratorUsers);
        }
      }
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'task_reminder',
          reminder_type: 'custom_reminder',
          task: {
            id: task.id,
            title: task.title,
            description: task.description || '',
            reminder_date: task.reminder_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: task.assignee_id === recipient.auth_user_id ? 'assignee' : 'collaborator' as const
          })),
          timestamp: new Date().toISOString(),
        };

        try {
          // Send webhook to automation platform
          const webhookUrl = Deno.env.get('REMINDER_WEBHOOK_URL');
          if (webhookUrl) {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookData),
            });
            
            if (!response.ok) {
              console.error('Webhook failed:', response.status, response.statusText);
            } else {
              console.log(`Sent custom reminder webhook for task: ${task.title}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for task:', task.title);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('task_reminders')
              .insert({
                task_id: task.id,
                reminder_type: 'custom_reminder',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send custom reminder webhook for task ${task.id}:`, error);
        }
      }
    }
    
    console.log(`Task reminder check complete. Sent ${emailsSent} webhook notifications.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        webhooksSent: emailsSent,
        startTasksChecked: startTasks?.length || 0,
        dueTasksChecked: dueTasks?.length || 0,
        reminderTasksChecked: reminderTasks?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error: any) {
    console.error('Error in send-task-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);