import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service is not configured. Please add the RESEND_API_KEY secret." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, subject, content }: TestEmailRequest = await req.json();
    console.log("Sending test email to:", email);

    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Donezy <noreply@donezy.io>",
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

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Test email sent successfully:", data?.id);

    return new Response(JSON.stringify({ success: true, message: "Test email sent successfully", email_id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send test email" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
