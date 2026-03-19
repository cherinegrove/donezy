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
    const { webhookUrl, message, threadKey, taskId, projectId } = await req.json();
    
    if (!webhookUrl || !message) {
      throw new Error("webhookUrl and message are required");
    }

    console.log("Sending message to Google Chat:", { webhookUrl, message, threadKey, taskId });

    // Build payload — always use threadKey if provided so replies stay in the same thread
    const payload: any = { text: message };

    if (threadKey) {
      payload.thread = { threadKey };
    }

    // Append ?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD so Google Chat
    // groups the message into the existing thread when the threadKey matches.
    const sendUrl = threadKey
      ? `${webhookUrl}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`
      : webhookUrl;

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Chat API error:", response.status, errorText);
      throw new Error(`Google Chat API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Message sent successfully:", result);

    // Persist thread→task mapping so the webhook can route replies back to Donezy
    if (taskId && projectId && threadKey) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Upsert: one mapping per threadKey is enough
        const { error: dbError } = await supabase
          .from('google_chat_thread_mappings')
          .upsert(
            { thread_key: threadKey, task_id: taskId, project_id: projectId },
            { onConflict: 'thread_key' }
          );

        if (dbError) {
          console.error("Failed to save thread mapping:", dbError);
        } else {
          console.log("Thread mapping saved:", { threadKey, taskId, projectId });
        }
      } catch (mappingErr) {
        // Non-fatal — notification still delivered
        console.error("Thread mapping save error:", mappingErr);
      }
    }

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
