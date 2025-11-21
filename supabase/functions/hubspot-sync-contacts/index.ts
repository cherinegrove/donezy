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

    console.log("Fetching contacts from HubSpot...");

    // Fetch contacts from HubSpot
    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,website,company',
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
    const contacts = hubspotData.results || [];

    console.log(`Found ${contacts.length} contacts in HubSpot`);

    // Get current user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error("User not authenticated");
    }

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each contact to clients table
    for (const contact of contacts) {
      try {
        const props = contact.properties;
        const name = `${props.firstname || ''} ${props.lastname || ''}`.trim() || props.email;
        
        const { error } = await supabase
          .from('clients')
          .upsert({
            name,
            email: props.email,
            phone: props.phone || null,
            website: props.website || null,
            auth_user_id: user.id,
            status: 'active',
          }, {
            onConflict: 'email',
          });

        if (error) {
          console.error("Error syncing contact:", error);
          errorCount++;
        } else {
          syncedCount++;
        }
      } catch (err) {
        console.error("Error processing contact:", err);
        errorCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount, 
        errors: errorCount,
        total: contacts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in hubspot-sync-contacts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});