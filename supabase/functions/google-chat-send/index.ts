import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, message, threadKey } = await req.json();
    
    if (!webhookUrl || !message) {
      throw new Error("webhookUrl and message are required");
    }

    console.log("Sending message to Google Chat:", { webhookUrl, message });

    const payload: any = {
      text: message
    };

    // Support threaded messages
    if (threadKey) {
      payload.thread = { threadKey };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Chat API error:", response.status, errorText);
      throw new Error(`Google Chat API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in google-chat-send:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});