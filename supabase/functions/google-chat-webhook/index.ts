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
    console.log("Received Google Chat webhook:", JSON.stringify(payload, null, 2));

    const eventType = payload.type;

    // ── Bot added to a space ───────────────────────────────────────────────
    if (eventType === 'ADDED_TO_SPACE') {
      return new Response(
        JSON.stringify({ text: "👋 Hi! I'm connected to Donezy. Reply to any task notification and your message will appear as a comment directly in Donezy!" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Incoming message ───────────────────────────────────────────────────
    if (eventType === 'MESSAGE') {
      const messageText = payload.message?.text?.trim() ?? '';
      const senderName = payload.message?.sender?.displayName ?? 'Someone';
      const threadName = payload.message?.thread?.name ?? ''; // e.g. "spaces/AAA/threads/BBB"
      const spaceName = payload.space?.name ?? '';

      console.log("Processing message:", { messageText, senderName, threadName, spaceName });

      // ── Slash commands ─────────────────────────────────────────────────
      if (messageText.startsWith('/')) {
        const command = messageText.split(' ')[0].toLowerCase();

        switch (command) {
          case '/help':
            return new Response(
              JSON.stringify({
                text: `*Donezy Google Chat Integration*\n\n• *Reply* to any task notification → comment appears in Donezy automatically\n• */help* – show this message\n\nThat's all you need! 🎉`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

          default:
            return new Response(
              JSON.stringify({ text: "Unknown command. Type /help to see available commands." }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
      }

      // ── Try to route reply to a Donezy task comment ────────────────────
      if (threadName) {
        // Derive the threadKey from the thread name.
        // When we send messages we set threadKey = "task-{taskId}".
        // Google Chat stores threads as "spaces/XXX/threads/YYY" but also
        // echoes back the threadKey in payload.message.thread.threadKey (Bot API).
        const threadKey =
          payload.message?.thread?.threadKey ??
          threadName.split('/').pop() ??
          threadName;

        console.log("Looking up thread mapping for key:", threadKey);

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Look up the task associated with this thread
        const { data: mapping, error: lookupError } = await supabase
          .from('google_chat_thread_mappings')
          .select('task_id, project_id')
          .eq('thread_key', threadKey)
          .maybeSingle();

        if (lookupError) {
          console.error("DB lookup error:", lookupError);
        }

        if (mapping?.task_id) {
          console.log("Found task mapping:", mapping);

          // Find the first admin/owner user to attach the comment to
          const { data: adminUser } = await supabase
            .from('users')
            .select('auth_user_id, id')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle();

          const userId = adminUser?.id ?? 'system';
          const authUserId = adminUser?.auth_user_id ?? '00000000-0000-0000-0000-000000000000';

          // Format the comment content so it's clearly from Google Chat
          const commentContent = `[Google Chat] *${senderName}*: ${messageText}`;

          const { error: commentError } = await supabase
            .from('comments')
            .insert({
              task_id: mapping.task_id,
              user_id: userId,
              auth_user_id: authUserId,
              content: commentContent,
              mentioned_user_ids: [],
            });

          if (commentError) {
            console.error("Failed to insert comment:", commentError);
            return new Response(
              JSON.stringify({ text: "⚠️ Your reply was received but couldn't be saved to Donezy. Please try again." }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log("Comment saved to Donezy task:", mapping.task_id);

          return new Response(
            JSON.stringify({ text: `✅ Your reply has been added as a comment in Donezy!` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Thread found but no mapping — just acknowledge
        console.log("No task mapping found for threadKey:", threadKey);
      }

      // Default: non-threaded message or no mapping found
      return new Response(
        JSON.stringify({ text: "💬 I received your message! Reply directly to a task notification to add a comment in Donezy." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Unknown event ──────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ text: "Event received" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in google-chat-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
