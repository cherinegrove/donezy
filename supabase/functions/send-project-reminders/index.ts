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
    console.log('Starting project reminder check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('Checking for project reminders on:', todayStr);
    
    // Find projects starting today that haven't had start date reminders sent
    const { data: startProjects, error: startProjectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        start_date,
        auth_user_id,
        team_ids,
        collaborator_ids
      `)
      .eq('start_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (startProjectsError) {
      console.error('Error fetching start date projects:', startProjectsError);
      throw startProjectsError;
    }
    
    console.log('Found', startProjects?.length || 0, 'projects starting today');
    
    // Find projects due today that haven't had due date reminders sent
    const { data: dueProjects, error: dueProjectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        due_date,
        auth_user_id,
        team_ids,
        collaborator_ids
      `)
      .eq('due_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (dueProjectsError) {
      console.error('Error fetching due projects:', dueProjectsError);
      throw dueProjectsError;
    }
    
    console.log('Found', dueProjects?.length || 0, 'projects due today');
    
    // Find projects with custom reminders for today
    const { data: reminderProjects, error: reminderProjectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        reminder_date,
        auth_user_id,
        team_ids,
        collaborator_ids
      `)
      .eq('reminder_date', todayStr)
      .not('auth_user_id', 'is', null);
    
    if (reminderProjectsError) {
      console.error('Error fetching reminder projects:', reminderProjectsError);
      throw reminderProjectsError;
    }
    
    console.log('Found', reminderProjects?.length || 0, 'projects with custom reminders today');
    
    let emailsSent = 0;
    
    // Process start date reminders
    for (const project of startProjects || []) {
      // Check if we already sent a start date reminder for this project
      const { data: existingReminder } = await supabase
        .from('project_reminders')
        .select('id')
        .eq('project_id', project.id)
        .eq('reminder_type', 'start_date')
        .single();
      
      if (existingReminder) {
        console.log(`Start date reminder already sent for project ${project.id}`);
        continue;
      }
      
      // Get list of recipients (team members + collaborators, excluding creator)
      const recipients = [];
      
      // Add team members if exist and different from creator
      if (project.team_ids && project.team_ids.length > 0) {
        const { data: teamUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.team_ids)
          .neq('auth_user_id', project.auth_user_id);
        
        if (teamUsers) {
          recipients.push(...teamUsers);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (project.collaborator_ids && project.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.collaborator_ids)
          .neq('auth_user_id', project.auth_user_id);
        
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
                project_name: project.name,
                project_description: project.description || '',
                reminder_type: 'start_date',
                project_start_date: project.start_date,
                subject: `Project Starting Today: ${project.name}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/projects`,
            }
          );
          
          if (authError) {
            console.error('Error sending start date reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('project_reminders')
            .insert({
              project_id: project.id,
              reminder_type: 'start_date',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent start date reminder for project: ${project.name} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send start date reminder for project ${project.id} to ${recipient.email}:`, error);
        }
      }
    }
    
    // Process due date reminders
    for (const project of dueProjects || []) {
      // Check if we already sent a due date reminder for this project
      const { data: existingReminder } = await supabase
        .from('project_reminders')
        .select('id')
        .eq('project_id', project.id)
        .eq('reminder_type', 'due_date')
        .single();
      
      if (existingReminder) {
        console.log(`Due date reminder already sent for project ${project.id}`);
        continue;
      }
      
      // Get list of recipients (team members + collaborators, excluding creator)
      const recipients = [];
      
      // Add team members if exist and different from creator
      if (project.team_ids && project.team_ids.length > 0) {
        const { data: teamUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.team_ids)
          .neq('auth_user_id', project.auth_user_id);
        
        if (teamUsers) {
          recipients.push(...teamUsers);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (project.collaborator_ids && project.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.collaborator_ids)
          .neq('auth_user_id', project.auth_user_id);
        
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
                project_name: project.name,
                project_description: project.description || '',
                reminder_type: 'due_date',
                project_due_date: project.due_date,
                subject: `Project Due Today: ${project.name}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/projects`,
            }
          );
          
          if (authError) {
            console.error('Error sending due date reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('project_reminders')
            .insert({
              project_id: project.id,
              reminder_type: 'due_date',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent due date reminder for project: ${project.name} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send due date reminder for project ${project.id} to ${recipient.email}:`, error);
        }
      }
    }
    
    // Process custom reminders
    for (const project of reminderProjects || []) {
      // Check if we already sent a custom reminder for this project
      const { data: existingReminder } = await supabase
        .from('project_reminders')
        .select('id')
        .eq('project_id', project.id)
        .eq('reminder_type', 'custom_reminder')
        .single();
      
      if (existingReminder) {
        console.log(`Custom reminder already sent for project ${project.id}`);
        continue;
      }
      
      // Get list of recipients (team members + collaborators, excluding creator)
      const recipients = [];
      
      // Add team members if exist and different from creator
      if (project.team_ids && project.team_ids.length > 0) {
        const { data: teamUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.team_ids)
          .neq('auth_user_id', project.auth_user_id);
        
        if (teamUsers) {
          recipients.push(...teamUsers);
        }
      }
      
      // Add collaborators if exist and different from creator
      if (project.collaborator_ids && project.collaborator_ids.length > 0) {
        const { data: collaboratorUsers } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', project.collaborator_ids)
          .neq('auth_user_id', project.auth_user_id);
        
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
                project_name: project.name,
                project_description: project.description || '',
                reminder_type: 'custom_reminder',
                project_due_date: project.due_date,
                subject: `Project Reminder: ${project.name}`,
              },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/projects`,
            }
          );
          
          if (authError) {
            console.error('Error sending custom reminder email:', authError);
            continue;
          }
          
          // Record that we sent this reminder
          await supabase
            .from('project_reminders')
            .insert({
              project_id: project.id,
              reminder_type: 'custom_reminder',
              email_sent_to: recipient.email,
            });
          
          emailsSent++;
          console.log(`Sent custom reminder for project: ${project.name} to ${recipient.email}`);
          
        } catch (error) {
          console.error(`Failed to send custom reminder for project ${project.id} to ${recipient.email}:`, error);
        }
      }
    }
    
    console.log(`Project reminder check complete. Sent ${emailsSent} emails.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        startProjectsChecked: startProjects?.length || 0,
        dueProjectsChecked: dueProjects?.length || 0,
        reminderProjectsChecked: reminderProjects?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error: any) {
    console.error('Error in send-project-reminders function:', error);
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