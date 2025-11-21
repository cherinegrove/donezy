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
        const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY');

        if (!hubspotApiKey) {
          console.error("HUBSPOT_API_KEY not configured in Supabase secrets");
          errorCount++;
          continue;
        }

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

        // Get the mapping configuration from database
        // For now, we'll use a default user - in production, you'd need to determine which user this belongs to
        const { data: users } = await supabase
          .from('users')
          .select('auth_user_id')
          .limit(1);

        if (!users || users.length === 0) {
          console.error("No users found in database");
          errorCount++;
          continue;
        }

        const authUserId = users[0].auth_user_id;

        // Get the first project for this user
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('auth_user_id', authUserId)
          .limit(1);

        if (!projects || projects.length === 0) {
          console.error("No projects found for user");
          errorCount++;
          continue;
        }

        const projectId = projects[0].id;

        // Map ticket priority to task priority
        const priorityMap: Record<string, string> = {
          'HIGH': 'high',
          'MEDIUM': 'medium',
          'LOW': 'low',
        };

        const priority = priorityMap[props.hs_ticket_priority] || 'medium';

        // Create task from ticket
        const taskData = {
          auth_user_id: authUserId,
          project_id: projectId,
          title: props.subject || `HubSpot Ticket #${ticketId}`,
          description: props.content || '',
          priority: priority,
          status: 'backlog',
          due_date: null,
        };

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
