import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { portal_token, task_id, client_name, content, mentioned_user_ids } =
      await req.json();

    if (!portal_token || !task_id || !client_name?.trim() || !content?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Validate portal token and get project_id
    const { data: portal, error: portalError } = await supabase
      .from("client_portals")
      .select("id, project_id")
      .eq("token", portal_token)
      .eq("is_active", true)
      .single();

    if (portalError || !portal) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive portal" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify the task belongs to this project
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, project_id")
      .eq("id", task_id)
      .eq("project_id", portal.project_id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: "Task not found in this project" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get the project owner auth_user_id (needed for comments.user_id and auth_user_id)
    const { data: project } = await supabase
      .from("projects")
      .select("auth_user_id, name")
      .eq("id", portal.project_id)
      .single();

    const ownerAuthId = project?.auth_user_id ?? "";

    // 4. Get the owner's user row (for user_id text field)
    const { data: ownerUser } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("auth_user_id", ownerAuthId)
      .single();

    // 5. Insert into the normal comments table (service role bypasses RLS)
    const commentContent = `[Client: ${client_name.trim()}] ${content.trim()}`;

    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert({
        task_id: task_id,
        user_id: ownerUser?.auth_user_id ?? ownerAuthId,
        auth_user_id: ownerAuthId,
        content: commentContent,
        mentioned_user_ids: mentioned_user_ids ?? [],
      })
      .select()
      .single();

    if (commentError) {
      console.error("Failed to insert comment:", commentError);
      return new Response(
        JSON.stringify({ error: "Failed to save comment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Fire mention notifications for any tagged team members
    const mentions: string[] = mentioned_user_ids ?? [];
    const projectUrl = Deno.env.get("APP_URL") ?? "";

    for (const userId of mentions) {
      try {
        await supabase.functions.invoke("send-mention-notification", {
          body: {
            mentionedUserId: userId,
            mentionerName: `${client_name.trim()} (Client)`,
            messageContent: content.trim(),
            taskId: task_id,
            commentId: comment.id,
            projectName: project?.name ?? "",
          },
        });
      } catch (e) {
        console.error("Failed to send mention notification for", userId, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, comment_id: comment.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
