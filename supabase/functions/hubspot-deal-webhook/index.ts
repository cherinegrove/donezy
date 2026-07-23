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
      return new Response(JSON.stringify({ success: true, message: "No events to process" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let processedCount = 0;

    for (const event of events) {
      try {
        // Only process deal closed won events
        if (event.subscriptionType !== 'deal.propertyChange' || event.propertyName !== 'dealstage' || event.propertyValue !== 'closedwon') {
          continue;
        }

        const dealId = event.objectId;

        // Get HubSpot API key and user settings
        const { data: settings, error: settingsError } = await supabase
          .from('integration_settings')
          .select('settings, auth_user_id')
          .eq('integration_name', 'hubspot')
          .limit(1)
          .single();

        if (settingsError || !settings?.settings) {
          console.error('HubSpot API key not configured:', settingsError);
          continue;
        }

        const settingsData = settings.settings as { apiKey?: string };
        const hubspotApiKey = settingsData.apiKey;

        if (!hubspotApiKey) {
          console.error('HubSpot API key not found');
          continue;
        }

        const userId = settings.auth_user_id;

        // Fetch deal details from HubSpot
        const dealResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,amount,closedate,hubspot_owner_id`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!dealResponse.ok) {
          console.error("HubSpot API error:", dealResponse.status);
          continue;
        }

        const dealData = await dealResponse.json();
        const props = dealData.properties;

        // Get field mappings from database
        const { data: mappingSettings } = await supabase
          .from('integration_settings')
          .select('settings')
          .eq('auth_user_id', userId)
          .eq('integration_name', 'hubspot_deal_mapping')
          .single();

        const mappings = mappingSettings?.settings || {};

        // Extract mapped values
        const projectName = props.dealname?.value || `Deal ${dealId}`;
        const dealAmount = parseFloat(props.amount?.value || '0');
        const dealCloseDate = props.closedate?.value;
        const conversion = (mappings as any)?.billableHourConversion || 1000;
        const allocatedHours = dealAmount / conversion;

        // Get associated company
        const companyResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let companyId: string | null = null;
        let companyName = "Unknown Company";

        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          if (companyData.results && companyData.results.length > 0) {
            companyId = companyData.results[0].id;

            // Fetch company details
            const companyDetailResponse = await fetch(
              `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name`,
              {
                headers: {
                  'Authorization': `Bearer ${hubspotApiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (companyDetailResponse.ok) {
              const companyDetail = await companyDetailResponse.json();
              companyName = companyDetail.properties?.name?.value || companyName;
            }
          }
        }

        // Check if deal already synced
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .eq('hubspot_deal_id', dealId)
          .single();

        if (existingProject) {
          console.log(`Deal ${dealId} already synced`);
          continue;
        }

        // Get or create client
        let clientId: string | null = null;
        if (companyId) {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('hubspot_company_id', companyId)
            .eq('user_id', userId)
            .single();

          if (existingClient) {
            clientId = existingClient.id;
          } else {
            const { data: newClient } = await supabase
              .from('clients')
              .insert({
                user_id: userId,
                name: companyName,
                hubspot_company_id: companyId,
                status: 'active',
                email: '',
              })
              .select('id')
              .single();

            if (newClient) {
              clientId = newClient.id;
            }
          }
        }

        // Create project
        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: projectName,
            description: `Created from HubSpot deal ${dealId}`,
            status: 'not-started',
            client_id: clientId,
            start_date: new Date().toISOString(),
            due_date: dealCloseDate ? new Date(parseInt(dealCloseDate)).toISOString() : null,
            allocated_hours: allocatedHours > 0 ? allocatedHours : 0,
            hubspot_deal_id: dealId,
          })
          .select('id')
          .single();

        if (newProject) {
          // Update HubSpot deal with project ID
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: {
                  donezy_project_id: newProject.id,
                },
              }),
            }
          );

          processedCount++;
          console.log(`Created project ${newProject.id} from deal ${dealId}`);
        }
      } catch (err) {
        console.error('Error processing event:', err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
