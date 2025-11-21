import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received HubSpot webhook payload:", JSON.stringify(payload, null, 2));

    // HubSpot sends an array of events
    const events = payload;
    if (!Array.isArray(events) || events.length === 0) {
      console.log("No events in payload");
      return new Response(JSON.stringify({ success: true, message: "No events to process" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let processedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Only process ticket creation events
        if (event.subscriptionType !== 'ticket.creation') {
          console.log(`Skipping event type: ${event.subscriptionType}`);
          continue;
        }

        const ticketId = event.objectId;

        // Get the first user's HubSpot API key from integration_settings
        const { data: settings, error: settingsError } = await supabase
          .from('integration_settings')
          .select('settings, auth_user_id')
          .eq('integration_name', 'hubspot')
          .limit(1)
          .single();

        if (settingsError || !settings?.settings) {
          console.error('HubSpot API key not configured:', settingsError);
          errorCount++;
          continue;
        }

        const settingsData = settings.settings as { apiKey?: string };
        const hubspotApiKey = settingsData.apiKey;
        
        if (!hubspotApiKey) {
          console.error('HubSpot API key not found in settings');
          errorCount++;
          continue;
        }

        const userId = settings.auth_user_id;

        // Fetch ticket details from HubSpot
        console.log(`Fetching ticket ${ticketId} from HubSpot...`);
        const ticketResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=subject,content,hs_pipeline_stage,hs_ticket_priority,createdate`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!ticketResponse.ok) {
          const errorText = await ticketResponse.text();
          console.error("HubSpot API error:", ticketResponse.status, errorText);
          errorCount++;
          continue;
        }

        const ticketData = await ticketResponse.json();
        const props = ticketData.properties;

        console.log("Ticket properties:", JSON.stringify(props, null, 2));

        // Get field mappings from database
        const { data: mappingSettings } = await supabase
          .from('integration_settings')
          .select('settings')
          .eq('auth_user_id', userId)
          .eq('integration_name', 'hubspot_ticket_mapping')
          .single();

        const mappingsData = mappingSettings?.settings as { mappings?: Array<{hubspotField: string, taskField: string}> };
        const mappings = mappingsData?.mappings || [
          { hubspotField: 'subject', taskField: 'title' },
          { hubspotField: 'content', taskField: 'description' },
          { hubspotField: 'hs_ticket_priority', taskField: 'priority' },
        ];

        // Get the first project for this user
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('auth_user_id', userId)
          .limit(1);

        if (!projects || projects.length === 0) {
          console.error("No projects found for user");
          errorCount++;
          continue;
        }

        const projectId = projects[0].id;

        // Map ticket properties to task fields
        const taskData: any = {
          auth_user_id: userId,
          project_id: projectId,
          status: 'backlog',
        };

        // Apply field mappings
        for (const mapping of mappings) {
          if (props[mapping.hubspotField]) {
            let value = props[mapping.hubspotField];
            
            // Handle priority mapping
            if (mapping.taskField === 'priority') {
              const priorityMap: Record<string, string> = {
                'HIGH': 'high',
                'MEDIUM': 'medium',
                'LOW': 'low',
              };
              value = priorityMap[value] || 'medium';
            }
            
            taskData[mapping.taskField] = value;
          }
        }

        // Ensure required fields have defaults
        if (!taskData.title) {
          taskData.title = `HubSpot Ticket #${ticketId}`;
        }

        console.log("Creating task:", JSON.stringify(taskData, null, 2));

        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (taskError) {
          console.error("Error creating task:", taskError);
          errorCount++;
        } else {
          console.log("Task created successfully:", task.id);
          processedCount++;
        }
      } catch (err) {
        console.error("Error processing event:", err);
        errorCount++;
      }
    }

    console.log(`Processing complete: ${processedCount} processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        errors: errorCount,
        total: events.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in hubspot-ticket-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
