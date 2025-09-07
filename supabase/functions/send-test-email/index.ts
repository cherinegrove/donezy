import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Donezy <onboarding@resend.dev>", // Replace with your verified domain
      to: [email],
      subject: `[TEST] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ff6b35; color: white; padding: 10px; text-align: center; margin-bottom: 20px; border-radius: 5px;">
            <strong>TEST EMAIL - Email Template Preview</strong>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">${subject}</h2>
            <div style="color: #666; line-height: 1.6; white-space: pre-line;">
              ${content}
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            This is a test email sent from your Donezy email template system.
          </div>
        </div>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test email sent successfully",
      data: emailResponse 
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