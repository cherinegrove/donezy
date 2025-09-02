import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase client with Service Role (needed for invite)
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, role, inviterName, companyName }: InviteEmailRequest =
      await req.json();

    console.log("Attempting to send invite email to:", email);

    // Invite user with Supabase Auth (uses your SMTP)
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role,
        inviter_name: inviterName,
        company_name: companyName || "Donezy",
      },
      // 👇 IMPORTANT: Send users to your confirm route
      redirectTo: "https://app.donezy.io/confirm",
    });

    if (error) {
      console.error("Supabase invite error:", error);
      // Handle the case where user already exists
      if (error.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ 
          error: "A user with this email address already exists. Please use a different email or contact the user directly." 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
