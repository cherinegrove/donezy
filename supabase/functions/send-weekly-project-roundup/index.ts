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

    // Get the date from one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    // Fetch all tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project_id);

    if (tasksError) {
      console.error("Tasks fetch error:", tasksError);
      return new Response(JSON.stringify({ error: "Failed to fetch tasks" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Categorize tasks and calculate stats
    const backlogTasks = tasks.filter((t: any) => t.status === "backlog");
    const inProgressTasks = tasks.filter((t: any) => t.status === "in-progress");
    const awaitingFeedbackTasks = tasks.filter((t: any) => 
      t.status === "review" || t.status === "awaiting-feedback"
    );
    const completedThisWeek = tasks.filter((t: any) => 
      t.status === "done" && new Date(t.updated_at) >= oneWeekAgo
    );
    const addedThisWeek = tasks.filter((t: any) => 
      new Date(t.created_at) >= oneWeekAgo
    );

    const stats = {
      backlogCount: backlogTasks.length,
      inProgressCount: inProgressTasks.length,
      awaitingFeedbackCount: awaitingFeedbackTasks.length,
      completedThisWeek: completedThisWeek.length,
      addedThisWeek: addedThisWeek.length,
    };

    // Build completed tasks section
    let completedSection = "";
    if (completedThisWeek.length > 0) {
      completedSection = "Tasks completed this week:\n\n";
      completedThisWeek.forEach((task: any) => {
        completedSection += `• ${task.title}\n`;
      });
      completedSection += "\n";
    }

    // Build in progress section
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
    }

    // Build awaiting feedback section
    let awaitingFeedbackSection = "";
    if (awaitingFeedbackTasks.length > 0) {
      awaitingFeedbackSection = "Friendly reminder that I am waiting on feedback for the below tasks:\n\n";
      awaitingFeedbackTasks.forEach((task: any) => {
        awaitingFeedbackSection += `• ${task.title}\n`;
        if (task.awaiting_feedback_details) {
          awaitingFeedbackSection += `  ${task.awaiting_feedback_details}\n`;
        }
      });
      awaitingFeedbackSection += "\n";
    }

    // Generate email content as plain text
    const emailContent = `Hi,

Here is the weekly project roundup.

${completedSection}${inProgressSection}${awaitingFeedbackSection}I hope you have a lovely weekend.

Warm Regards`;

    const subject = `Weekly Update: ${project.name} - Week of ${new Date().toLocaleDateString()}`;

    return new Response(
      JSON.stringify({
        success: true,
        subject,
        emailContent,
        stats,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-project-roundup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
