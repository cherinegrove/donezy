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

    // Google Chat sends different event types
    const eventType = payload.type;

    if (eventType === 'ADDED_TO_SPACE') {
      // Bot was added to a space
      return new Response(
        JSON.stringify({ text: "Thanks for adding me! I'll send notifications about your tasks and projects here." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (eventType === 'MESSAGE') {
      const message = payload.message?.text?.trim();
      const spaceId = payload.space?.name;
      const userId = payload.user?.name;

      console.log("Processing message:", { message, spaceId, userId });

      // Parse commands
      if (message?.startsWith('/')) {
        const command = message.split(' ')[0].toLowerCase();
        
        switch (command) {
          case '/help':
            return new Response(
              JSON.stringify({ 
                text: `*Available Commands:*
• /help - Show this help message
• /status - Check your task status
• /create [task] - Create a new task

I'll also automatically notify you about task updates!` 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
            
          case '/status':
            // In a real implementation, fetch user's tasks from Supabase
            return new Response(
              JSON.stringify({ 
                text: "📊 Here's your task overview:\n• 5 tasks in progress\n• 2 tasks due today\n• 3 overdue tasks" 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
            
          case '/create':
            const taskName = message.substring(7).trim();
            if (!taskName) {
              return new Response(
                JSON.stringify({ text: "Please provide a task name: /create [task name]" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            // TODO: Create task in Supabase
            return new Response(
              JSON.stringify({ 
                text: `✅ Task created: "${taskName}"\nYou can view it in your dashboard.` 
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

      // Default response for non-command messages
      return new Response(
        JSON.stringify({ text: "I received your message! Type /help to see what I can do." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown event type
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