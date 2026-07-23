import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncProjectPayload {
  projectId: string;
  userId: string;
  changes: {
    name?: string;
    status?: string;
    usedHours?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as SyncProjectPayload;
    const { projectId, userId, changes } = payload;

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (!project || !project.hubspot_deal_id) {
      return new Response(
        JSON.stringify({ synced: false, reason: "Project not linked to HubSpot deal" }),
        { status: 200 }
      );
    }

    // Get HubSpot API key
    const { data: settingsData } = await supabase
      .from("integration_settings")
      .select("settings")
      .eq("auth_user_id", userId)
      .eq("integration_name", "hubspot")
      .single();

    const apiKey = (settingsData?.settings as any)?.apiKey;
    if (!apiKey) {
      throw new Error("HubSpot API key not configured");
    }

    // Get mapping configuration
    const { data: mappingData } = await supabase
      .from("integration_settings")
      .select("settings")
      .eq("auth_user_id", userId)
      .eq("integration_name", "hubspot_deal_mapping")
      .single();

    const mapping = mappingData?.settings || {
      dealNameField: "dealname",
      dealAmountField: "amount",
      billableHourConversion: 1000,
    };

    // Build properties to update in HubSpot
    const properties: Record<string, string> = {
      donezy_project_status: project.status,
      donezy_hours_spent: (changes.usedHours || project.used_hours || 0).toString(),
    };

    // Sync name changes
    if (changes.name) {
      properties[mapping.dealNameField] = changes.name;
    }

    // Sync client name changes
    if (project.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", project.client_id)
        .single();

      if (client && changes.name) {
        // Only sync client name if we have it
        properties["hs_company_name"] = client.name;
      }
    }

    // Update deal in HubSpot
    const updateResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${project.hubspot_deal_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error("Failed to sync to HubSpot:", errorData);
      throw new Error(`Failed to sync to HubSpot: ${updateResponse.statusText}`);
    }

    return new Response(
      JSON.stringify({
        synced: true,
        dealId: project.hubspot_deal_id,
        propertiesUpdated: Object.keys(properties),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing project to HubSpot:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
