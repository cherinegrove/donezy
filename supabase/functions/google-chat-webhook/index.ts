import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as jose from 'https://esm.sh/jose@5.2.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADDON_SERVICE_ACCOUNT = 'service-175039974377@gcp-sa-gsuiteaddons.iam.gserviceaccount.com';
const DEFAULT_AUDIENCE = 'https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/google-chat-webhook';
const GOOGLE_JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const chatReply = (text: string, threadName?: string) => ({
  hostAppDataAction: {
    chatDataAction: {
      createMessageAction: {
        message: threadName ? { text, thread: { name: threadName } } : { text },
      },
    },
  },
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const mentionsName = (text: string, name: string) =>
  new RegExp(`@${escapeRegex(name)}(?![\\w])`, 'i').test(text);

async function isFromGoogleChat(event: any): Promise<boolean> {
  const token = event.authorizationEventObject?.systemIdToken;
  if (!token) return false;

  try {
    const { payload } = await jose.jwtVerify(token, GOOGLE_JWKS, {
      issuer: 'https://accounts.google.com',
      audience: Deno.env.get('GOOGLE_CHAT_AUDIENCE') ?? DEFAULT_AUDIENCE,
    });
    return payload.email === ADDON_SERVICE_ACCOUNT && payload.email_verified === true;
  } catch (err) {
    console.error('Google Chat request verification failed:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event = await req.json();

    if (!(await isFromGoogleChat(event))) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const chat = event.chat ?? {};

    if (chat.addedToSpacePayload) {
      return jsonResponse(chatReply("👋 Hi! I'm connected to Donezy. Reply to any task notification and your message will appear as a comment in Donezy."));
    }

    const message = chat.messagePayload?.message;
    if (!message) {
      return jsonResponse({});
    }

    const text = (message.argumentText ?? message.text ?? '').trim();
    const senderName = chat.user?.displayName ?? 'Someone';
    const senderEmail: string | null = chat.user?.email ?? null;
    const threadName: string = message.thread?.name ?? '';

    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();
      if (command === '/help') {
        return jsonResponse(chatReply(
          "*Donezy Google Chat Integration*\n\n• *Reply* to any task notification → comment appears in Donezy automatically\n• Type *@Name* to notify someone in Donezy\n• */help* – show this message"
        ));
      }
      return jsonResponse(chatReply("Unknown command. Type /help to see available commands."));
    }

    if (!threadName) {
      return jsonResponse(chatReply("💬 Reply to a task notification to add a comment in Donezy."));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: mapping } = await supabase
      .from('google_chat_thread_mappings')
      .select('task_id, project_id')
      .eq('thread_key', threadName)
      .maybeSingle();

    if (!mapping?.task_id) {
      return jsonResponse(chatReply(
        "⚠️ I couldn't find the Donezy task for this thread. Reply to a task notification to add a comment.",
        threadName
      ));
    }

    let author: { auth_user_id: string } | null = null;
    if (senderEmail) {
      const { data } = await supabase
        .from('users')
        .select('auth_user_id')
        .ilike('email', senderEmail)
        .maybeSingle();
      author = data;
    }

    if (!author) {
      const { data } = await supabase
        .from('users')
        .select('auth_user_id')
        .ilike('name', senderName)
        .maybeSingle();
      author = data;
    }

    if (!author) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      author = adminUser;
    }

    const { data: allUsers } = await supabase
      .from('users')
      .select('auth_user_id, name');
    const mentionedAuthIds = (allUsers ?? [])
      .filter((u) => u.name && u.auth_user_id && (mentionsName(text, u.name) || mentionsName(text, u.name.split(' ')[0])))
      .map((u) => u.auth_user_id as string);

    const content = author
      ? `[Google Chat] ${text}`
      : `[Google Chat] ${senderName}: ${text}`;

    const { data: insertedComment, error: commentError } = await supabase
      .from('comments')
      .insert({
        task_id: mapping.task_id,
        user_id: author?.auth_user_id ?? 'system',
        auth_user_id: author?.auth_user_id ?? '00000000-0000-0000-0000-000000000000',
        content,
        mentioned_user_ids: mentionedAuthIds,
      })
      .select('id')
      .single();

    if (commentError) {
      console.error('Failed to insert comment:', commentError);
      return jsonResponse(chatReply(
        "⚠️ Your reply was received but couldn't be saved to Donezy. Please try again.",
        threadName
      ));
    }

    try {
      const { data: taskRow } = await supabase
        .from('tasks')
        .select('title, project_id')
        .eq('id', mapping.task_id)
        .maybeSingle();
      const { data: projectRow } = taskRow?.project_id
        ? await supabase.from('projects').select('name').eq('id', taskRow.project_id).maybeSingle()
        : { data: null };

      const context = {
        taskTitle: taskRow?.title,
        actorName: senderName,
        projectName: projectRow?.name,
        commentPreview: text.length > 100 ? `${text.slice(0, 100)}...` : text,
      };

      await supabase.functions.invoke('dispatch-notification', {
        body: {
          eventType: 'task_commented',
          actorId: author?.auth_user_id,
          taskId: mapping.task_id,
          excludeRecipientIds: mentionedAuthIds,
          context,
        },
      });

      if (mentionedAuthIds.length > 0) {
        await supabase.functions.invoke('dispatch-notification', {
          body: {
            eventType: 'mentioned',
            actorId: author?.auth_user_id,
            taskId: mapping.task_id,
            recipientIds: mentionedAuthIds,
            context,
          },
        });
      }
    } catch (notifyErr) {
      console.error('Comment saved but notification failed:', notifyErr);
    }

    console.log('Comment saved from Google Chat:', insertedComment?.id, 'mentions:', mentionedAuthIds.length);

    return jsonResponse(chatReply("✅ Added as a comment in Donezy.", threadName));
  } catch (error) {
    console.error('Error in google-chat-webhook:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});
