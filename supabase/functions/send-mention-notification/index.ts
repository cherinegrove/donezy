import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Processing mention notification request');
    
    const { mentionedUserId, mentionerName, messageContent, taskId, commentId } = await req.json();
    
    if (!mentionedUserId || !mentionerName || !messageContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the mentioned user's details
    const { data: mentionedUser, error: userError } = await supabase
      .from('users')
      .select('name, email, auth_user_id')
      .eq('auth_user_id', mentionedUserId)
      .single();
    
    if (userError || !mentionedUser) {
      console.error('Error fetching mentioned user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the mentioner's user details
    const { data: mentionerUser, error: mentionerError } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('name', mentionerName)
      .single();
    
    const fromUserId = mentionerUser?.auth_user_id || mentionedUserId; // fallback to avoid error
    
    // Create a notification message for the mentioned user
    const plainText = messageContent.replace(/<[^>]*>/g, '').substring(0, 100); // Strip HTML and truncate
    
    const { data: notification, error: notificationError } = await supabase
      .from('messages')
      .insert({
        from_user_id: fromUserId,
        to_user_id: mentionedUserId,
        subject: `You were mentioned by ${mentionerName}`,
        content: `You were mentioned in a comment: "${plainText}${plainText.length >= 100 ? '...' : ''}"`,
        priority: 'high',
        read: false,
        task_id: taskId || null,
        auth_user_id: fromUserId
      })
      .select()
      .single();
    
    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Send email notification using Resend
    const resendApiKey = Deno.env.get('resend');
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'notifications@taskflow.app',
            to: [mentionedUser.email],
            subject: `You were mentioned by ${mentionerName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">You were mentioned!</h2>
                <p><strong>${mentionerName}</strong> mentioned you in a comment:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                  <p style="margin: 0;">${plainText}${plainText.length >= 100 ? '...' : ''}</p>
                </div>
                <p>
                  <a href="${supabaseUrl.replace('.supabase.co', '')}/tasks" 
                     style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    View Task
                  </a>
                </p>
              </div>
            `,
          }),
        });
        
        if (!emailResponse.ok) {
          console.error('Failed to send email:', await emailResponse.text());
        } else {
          console.log(`Mention notification email sent to ${mentionedUser.email}`);
        }
      } catch (emailError) {
        console.error('Error sending mention notification email:', emailError);
      }
    }
    
    console.log(`Created mention notification for user ${mentionedUser.name}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationId: notification.id,
        emailSent: !!resendApiKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in send-mention-notification function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});