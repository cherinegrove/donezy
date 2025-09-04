import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailData {
  name: string;
  role: string;
  inviter_name: string;
  company_name: string;
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
      
      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          // Send email using Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            recipient.email,
            {
              data: {
                task_title: task.title,
                task_description: task.description || '',
                reminder_type: 'start_date',
                task_start_date: task.start_date,
                subject: `Task Starting Today: ${task.title}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/tasks`,
            }
          );
          
          if (authError) {
            console.error('Error sending start date reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('task_reminders')
            .insert({
              task_id: task.id,
              reminder_type: 'start_date',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent start date reminder for task: ${task.title} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send start date reminder for task ${task.id} to ${recipient.email}:`, error);
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
      
      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          // Send email using Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            recipient.email,
            {
              data: {
                task_title: task.title,
                task_description: task.description || '',
                reminder_type: 'due_date',
                task_due_date: task.due_date,
                subject: `Task Due Today: ${task.title}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/tasks`,
            }
          );
          
          if (authError) {
            console.error('Error sending due date reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('task_reminders')
            .insert({
              task_id: task.id,
              reminder_type: 'due_date',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent due date reminder for task: ${task.title} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send due date reminder for task ${task.id} to ${recipient.email}:`, error);
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
      
      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          // Send email using Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
            recipient.email,
            {
              data: {
                task_title: task.title,
                task_description: task.description || '',
                reminder_type: 'custom_reminder',
                task_due_date: task.due_date,
                subject: `Task Reminder: ${task.title}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/tasks`,
            }
          );
          
          if (authError) {
            console.error('Error sending custom reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('task_reminders')
            .insert({
              task_id: task.id,
              reminder_type: 'custom_reminder',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent custom reminder for task: ${task.title} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send custom reminder for task ${task.id} to ${recipient.email}:`, error);
        }
      }
    }
    
    console.log(`Task reminder check complete. Sent ${emailsSent} emails.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
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