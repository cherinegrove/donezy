
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const emailResponse = await resend.emails.send({
      from: "Manex <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${companyName || 'the team'} on Manex`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">You're Invited!</h1>
          
          <p>Hi ${name},</p>
          
          <p>${inviterName} has invited you to join ${companyName || 'their team'} on Manex as a <strong>${role}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">What is Manex?</h3>
            <p style="margin-bottom: 0;">Manex is a comprehensive project management and time tracking platform that helps teams collaborate effectively and manage their work efficiently.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6c757d; font-size: 14px;">${inviteLink}</p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #6c757d; font-size: 12px; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
            <br>
            This invitation was sent by ${inviterName} (${email}).
          </p>
        </div>
      `,
    });

    console.log("Invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
