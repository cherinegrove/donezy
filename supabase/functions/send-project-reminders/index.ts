import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookData {
  type: 'project_reminder';
  reminder_type: 'start_date' | 'due_date' | 'custom_reminder';
  project: {
    id: string;
    name: string;
    description: string;
    start_date?: string;
    due_date?: string;
    reminder_date?: string;
  };
  recipients: {
    name: string;
    email: string;
    role: 'team_member' | 'collaborator';
  }[];
  timestamp: string;
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
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'project_reminder',
          reminder_type: 'start_date',
          project: {
            id: project.id,
            name: project.name,
            description: project.description || '',
            start_date: project.start_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: project.team_ids?.includes(recipient.auth_user_id) ? 'team_member' : 'collaborator' as const
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
              console.log(`Sent start date reminder webhook for project: ${project.name}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for project:', project.name);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('project_reminders')
              .insert({
                project_id: project.id,
                reminder_type: 'start_date',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send start date reminder webhook for project ${project.id}:`, error);
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
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'project_reminder',
          reminder_type: 'due_date',
          project: {
            id: project.id,
            name: project.name,
            description: project.description || '',
            due_date: project.due_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: project.team_ids?.includes(recipient.auth_user_id) ? 'team_member' : 'collaborator' as const
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
              console.log(`Sent due date reminder webhook for project: ${project.name}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for project:', project.name);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('project_reminders')
              .insert({
                project_id: project.id,
                reminder_type: 'due_date',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send due date reminder webhook for project ${project.id}:`, error);
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
      
      // Prepare webhook data for all recipients
      if (recipients.length > 0) {
        const webhookData: WebhookData = {
          type: 'project_reminder',
          reminder_type: 'custom_reminder',
          project: {
            id: project.id,
            name: project.name,
            description: project.description || '',
            reminder_date: project.reminder_date,
          },
          recipients: recipients.map(recipient => ({
            name: recipient.name,
            email: recipient.email,
            role: project.team_ids?.includes(recipient.auth_user_id) ? 'team_member' : 'collaborator' as const
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
              console.log(`Sent custom reminder webhook for project: ${project.name}`);
            }
          } else {
            console.log('No webhook URL configured, skipping reminder for project:', project.name);
          }
          
          // Record that we sent this reminder
          for (const recipient of recipients) {
            await supabase
              .from('project_reminders')
              .insert({
                project_id: project.id,
                reminder_type: 'custom_reminder',
                email_sent_to: recipient.email,
              });
          }
          
          emailsSent += recipients.length;
          
        } catch (error) {
          console.error(`Failed to send custom reminder webhook for project ${project.id}:`, error);
        }
      }
    }
    
    console.log(`Project reminder check complete. Sent ${emailsSent} webhook notifications.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        webhooksSent: emailsSent,
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