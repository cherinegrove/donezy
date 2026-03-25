import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyRoundupRequest {
  project_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { project_id }: WeeklyRoundupRequest = await req.json();
    console.log("Generating weekly roundup for project:", project_id);

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, clients(*)")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch only In Progress tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project_id)
      .eq("status", "in-progress");

    if (tasksError) {
      console.error("Tasks fetch error:", tasksError);
      return new Response(JSON.stringify({ error: "Failed to fetch tasks" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const inProgressTasks = tasks ?? [];

    const stats = {
      inProgressCount: inProgressTasks.length,
      // kept for backward compat
      backlogCount: 0,
      awaitingFeedbackCount: 0,
      completedThisWeek: 0,
      addedThisWeek: 0,
    };

    // Build in-progress section
    let inProgressSection = "";
    if (inProgressTasks.length > 0) {
      inProgressSection = "Tasks currently in progress:\n\n";
      inProgressTasks.forEach((task: any) => {
        inProgressSection += `• ${task.title}`;
        if (task.due_date) {
          inProgressSection += ` (Due: ${new Date(task.due_date).toLocaleDateString()})`;
        }
        inProgressSection += `\n`;
      });
      inProgressSection += "\n";
    } else {
      inProgressSection = "No tasks are currently in progress.\n\n";
    }

    const emailContent = `Hi,

Here is the weekly project roundup for ${project.name}.

${inProgressSection}I hope you have a lovely weekend.

Warm Regards`;

    const subject = `Weekly Update: ${project.name} – ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

    return new Response(
      JSON.stringify({ success: true, subject, emailContent, stats }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-project-roundup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
