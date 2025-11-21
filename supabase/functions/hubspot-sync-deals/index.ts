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
    const { hubspotApiKey } = await req.json();
    
    if (!hubspotApiKey) {
      throw new Error("HubSpot API key is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching deals from HubSpot...");

    // Fetch deals from HubSpot
    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,description',
      {
        headers: {
          'Authorization': `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!hubspotResponse.ok) {
      const errorText = await hubspotResponse.text();
      console.error("HubSpot API error:", hubspotResponse.status, errorText);
      throw new Error(`HubSpot API error: ${hubspotResponse.status}`);
    }

    const hubspotData = await hubspotResponse.json();
    const deals = hubspotData.results || [];

    console.log(`Found ${deals.length} deals in HubSpot`);

    // Get current user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get or create a default client for HubSpot deals
    const { data: defaultClient, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('name', 'HubSpot Deals')
      .single();

    let clientId: string;

    if (clientError || !defaultClient) {
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: 'HubSpot Deals',
          email: 'hubspot@example.com',
          auth_user_id: user.id,
          status: 'active',
        })
        .select('id')
        .single();

      if (createError) throw createError;
      clientId = newClient.id;
    } else {
      clientId = defaultClient.id;
    }

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each deal to projects table
    for (const deal of deals) {
      try {
        const props = deal.properties;
        
        // Map HubSpot deal stage to project status
        const statusMap: { [key: string]: string } = {
          'appointmentscheduled': 'planning',
          'qualifiedtobuy': 'in-progress',
          'presentationscheduled': 'in-progress',
          'decisionmakerboughtin': 'in-progress',
          'contractsent': 'in-progress',
          'closedwon': 'completed',
          'closedlost': 'on-hold',
        };

        const status = statusMap[props.dealstage] || 'planning';
        
        const { error } = await supabase
          .from('projects')
          .upsert({
            name: props.dealname || 'Untitled Deal',
            description: props.description || '',
            client_id: clientId,
            auth_user_id: user.id,
            status,
            due_date: props.closedate || null,
            service_type: 'consulting',
          }, {
            onConflict: 'name,client_id',
          });

        if (error) {
          console.error("Error syncing deal:", error);
          errorCount++;
        } else {
          syncedCount++;
        }
      } catch (err) {
        console.error("Error processing deal:", err);
        errorCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount, 
        errors: errorCount,
        total: deals.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in hubspot-sync-deals:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});