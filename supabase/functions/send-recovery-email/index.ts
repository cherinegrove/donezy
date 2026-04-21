import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  email: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink }: RecoveryEmailRequest = await req.json();

    console.log("Sending recovery email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Donezy <noreply@donezy.io>",
      to: [email],
      subject: "Reset your Donezy password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 40px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .title { font-size: 24px; margin-bottom: 20px; color: #1f2937; }
            .content { margin-bottom: 30px; font-size: 16px; line-height: 1.7; }
            .button { display: inline-block; padding: 14px 30px; background-color: #2563eb; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #6b7280; text-align: center; }
            .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; }
            .code { font-family: 'Courier New', monospace; background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 14px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">donezy</div>
              <h1 class="title">Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your Donezy account associated with <strong>${email}</strong>.</p>
              <p>Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p class="code">${resetLink}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              <p>This email was sent by Donezy. If you have questions, contact your system administrator.</p>
              <p>&copy; ${new Date().getFullYear()} Donezy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Recovery email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending recovery email:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
