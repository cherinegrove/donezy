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

const WEBHOOK_HANDLER_URL = Deno.env.get("SUPABASE_URL")
  ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-handle-webhook`
  : "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get HubSpot API key from settings
    const { data: settingsData } = await supabase
      .from("integration_settings")
      .select("settings")
      .eq("auth_user_id", user.id)
      .eq("integration_name", "hubspot")
      .single();

    const apiKey = (settingsData?.settings as any)?.apiKey;
    if (!apiKey) {
      throw new Error("HubSpot API key not configured");
    }

    // Get app ID (this would be your app ID from HubSpot)
    const appId = parseInt(Deno.env.get("HUBSPOT_APP_ID") || "0");
    if (appId === 0) {
      throw new Error("HubSpot app ID not configured in environment");
    }

    // Register webhook for deal closed won events
    const subscriptionResponse = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals/subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestBody: {
            subscriptionDetails: {
              subscriptionUrl: WEBHOOK_HANDLER_URL,
              maxConcurrentRequests: 10,
              throttle: {
                period: "SECONDLY",
                maxEventsToCollect: 100,
              },
            },
            inputFields: [],
            propertyName: "dealstage",
            externalAccountId: "",
            active: true,
            eventTypes: ["propertyChange"],
          },
        }),
      }
    );

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.text();
      throw new Error(`Failed to register webhook: ${errorData}`);
    }

    const subscriptionData = (await subscriptionResponse.json()) as any;
    const subscriptionId = subscriptionData.id;

    // Store subscription ID for reference
    await supabase
      .from("integration_settings")
      .upsert({
        auth_user_id: user.id,
        integration_name: "hubspot_webhook",
        settings: {
          subscriptionId,
          registeredAt: new Date().toISOString(),
          webhookUrl: WEBHOOK_HANDLER_URL,
        },
      }, {
        onConflict: "auth_user_id,integration_name",
      });

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId,
        message: "HubSpot webhook registered successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error registering webhook:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
