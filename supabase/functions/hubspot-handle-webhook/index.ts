import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface HubSpotWebhookPayload {
  objectId: string;
  propertyName: string;
  propertyValue: string;
  changeSource: string;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const payload = await req.json() as HubSpotWebhookPayload[];

    // Check if this is a deal closed won event
    const closedWonEvents = payload.filter(
      event =>
        event.subscriptionType === "deal.propertyChange" &&
        event.propertyName === "dealstage" &&
        event.propertyValue === "closedwon"
    );

    if (closedWonEvents.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    // Get integration settings and mapping
    const { data: settingsData } = await supabase
      .from("integration_settings")
      .select("auth_user_id, settings")
      .eq("integration_name", "hubspot")
      .limit(1);

    if (!settingsData || settingsData.length === 0) {
      throw new Error("HubSpot integration not configured");
    }

    const authUserId = settingsData[0].auth_user_id;
    const apiKey = (settingsData[0].settings as any)?.apiKey;

    if (!apiKey) {
      throw new Error("HubSpot API key not configured");
    }

    // Get mapping configuration
    const { data: mappingData } = await supabase
      .from("integration_settings")
      .select("settings")
      .eq("auth_user_id", authUserId)
      .eq("integration_name", "hubspot_deal_mapping")
      .single();

    const mapping = mappingData?.settings || {
      dealNameField: "dealname",
      dealAmountField: "amount",
      dealCloseDate: true,
      dealOwnerField: "hubspot_owner_id",
      billableHourConversion: 1000,
    };

    // Process each closed won deal
    let processedCount = 0;

    for (const event of closedWonEvents) {
      const dealId = event.objectId;

      // Fetch deal details from HubSpot
      const dealResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?limit=100&archived=false`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!dealResponse.ok) {
        console.error(`Failed to fetch deal ${dealId}:`, dealResponse.statusText);
        continue;
      }

      const dealData = (await dealResponse.json()) as any;
      const properties = dealData.properties || {};

      // Extract deal information
      const dealName = properties[mapping.dealNameField]?.value || `Deal ${dealId}`;
      const dealAmount = parseFloat(properties[mapping.dealAmountField]?.value || "0");
      const dealCloseDate = mapping.dealCloseDate ? properties.closedate?.value : null;
      const dealOwnerId = properties[mapping.dealOwnerField]?.value;

      // Get associated company
      const associationsResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/companies`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      let companyId: string | null = null;
      let companyName = "Unknown Company";

      if (associationsResponse.ok) {
        const associationsData = (await associationsResponse.json()) as any;
        if (associationsData.results && associationsData.results.length > 0) {
          companyId = associationsData.results[0].id;

          // Fetch company details
          const companyResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?limit=100`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (companyResponse.ok) {
            const companyData = (await companyResponse.json()) as any;
            companyName = companyData.properties?.name?.value || companyName;
          }
        }
      }

      // Calculate allocated hours from deal amount
      const allocatedHours = dealAmount / mapping.billableHourConversion;

      // Check if deal is already synced
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .eq("hubspot_deal_id", dealId)
        .single();

      if (existingProject) {
        console.log(`Deal ${dealId} already synced as project ${existingProject.id}`);
        continue;
      }

      // Check if client exists or create it
      let clientId: string | null = null;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("hubspot_company_id", companyId)
        .eq("user_id", authUserId)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            user_id: authUserId,
            name: companyName,
            hubspot_company_id: companyId,
            status: "active",
          })
          .select("id")
          .single();

        if (clientError) {
          console.error(`Failed to create client for company ${companyId}:`, clientError);
          continue;
        }

        clientId = newClient.id;
      }

      // Find assignee by owner ID if provided
      let assigneeId: string | null = null;
      if (dealOwnerId) {
        // TODO: Map HubSpot owner ID to Donezy user (would need additional mapping table)
        // For now, just skip assignment
      }

      // Create project
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: authUserId,
          name: dealName,
          description: `Created from HubSpot deal ${dealId}`,
          status: "not-started",
          client_id: clientId,
          start_date: new Date().toISOString(),
          due_date: dealCloseDate ? new Date(parseInt(dealCloseDate)).toISOString() : null,
          allocated_hours: allocatedHours > 0 ? allocatedHours : 0,
          hubspot_deal_id: dealId,
        })
        .select("id")
        .single();

      if (projectError) {
        console.error(`Failed to create project for deal ${dealId}:`, projectError);
        continue;
      }

      // Store project ID back in HubSpot
      const hubspotUpdateResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              donezy_project_id: newProject.id,
            },
          }),
        }
      );

      if (!hubspotUpdateResponse.ok) {
        console.error(`Failed to update HubSpot deal with project ID:`, hubspotUpdateResponse.statusText);
      }

      processedCount++;
      console.log(`Created project ${newProject.id} from deal ${dealId}`);
    }

    return new Response(
      JSON.stringify({ processed: processedCount, total: closedWonEvents.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
