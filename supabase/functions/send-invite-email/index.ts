
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use Supabase client for built-in email functionality
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  name: string;
  role: string;
  inviterName: string;
  companyName?: string;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, role, inviterName, companyName, inviteLink }: InviteEmailRequest = await req.json();

    console.log("Attempting to send invite email to:", email);

    // Use Supabase Auth to invite user directly - this uses your configured SMTP
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        role: role,
        inviter_name: inviterName,
        company_name: companyName || 'Donezy'
      },
      redirectTo: inviteLink
    });

    if (error) {
      console.error("Supabase invite error:", error);
      throw error;
    }

    console.log("Invite sent successfully via Supabase:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
