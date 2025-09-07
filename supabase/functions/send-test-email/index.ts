import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use service role to send emails
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  email: string;
  subject: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, subject, content }: TestEmailRequest = await req.json();

    console.log("Sending test email to:", email);
    console.log("Subject:", subject);

    // Send test email using Supabase Auth admin
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        test_email: true,
        custom_subject: subject,
        custom_content: content,
      },
      redirectTo: `${req.headers.get('origin') || 'https://app.donezy.io'}/admin`,
    });

    if (error) {
      console.error("Error sending test email:", error);
      
      // Handle case where user already exists
      if (error.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ 
          error: "Test email functionality requires a new email address. The recipient already has an account." 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      throw error;
    }

    console.log("Test email sent successfully:", data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test email sent successfully",
      data 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to send test email" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);