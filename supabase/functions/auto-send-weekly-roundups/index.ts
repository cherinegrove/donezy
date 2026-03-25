import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map day names to JS getDay() values (0=Sun, 1=Mon, ... 6=Sat)
const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    // Find all projects with enabled roundup schedules
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, weekly_roundup_settings, clients(email, name)")
      .not("weekly_roundup_settings", "is", null);

    if (error) throw error;

    const resend = new Resend(resendApiKey);
    let sent = 0;

    for (const project of projects ?? []) {
      const settings = project.weekly_roundup_settings as any;
      if (!settings?.enabled) continue;

      const scheduledDay = DAY_MAP[settings.day?.toLowerCase() ?? "friday"] ?? 5;
      const scheduledTime = settings.time ?? "09:00";

      // Match day and time (within the same hour)
      if (scheduledDay !== currentDay) continue;
      if (scheduledTime.slice(0, 2) !== currentHour) continue;

      const recipientEmail = settings.recipientEmail ||
        (Array.isArray(project.clients) ? project.clients[0]?.email : (project.clients as any)?.email);

      if (!recipientEmail) {
        console.log(`No recipient email for project ${project.id}, skipping`);
        continue;
      }

      // Fetch in-progress tasks only
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, due_date")
        .eq("project_id", project.id)
        .eq("status", "in-progress");

      const inProgressTasks = tasks ?? [];

      let taskList = "";
      if (inProgressTasks.length > 0) {
        taskList = inProgressTasks.map((t: any) => {
          let line = `• ${t.title}`;
          if (t.due_date) line += ` (Due: ${new Date(t.due_date).toLocaleDateString()})`;
          return line;
        }).join("\n");
      } else {
        taskList = "No tasks are currently in progress.";
      }

      const subject = `Weekly Update: ${project.name} – ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
      const htmlContent = `
        <p>Hi,</p>
        <p>Here is the weekly project roundup for <strong>${project.name}</strong>.</p>
        <p><strong>Tasks currently in progress:</strong></p>
        <pre style="font-family:sans-serif;white-space:pre-wrap;">${taskList}</pre>
        <p>I hope you have a lovely weekend.</p>
        <p>Warm Regards</p>
      `;

      const { error: sendError } = await resend.emails.send({
        from: "Donezy <noreply@donezy.io>",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      });

      if (sendError) {
        console.error(`Failed to send roundup for project ${project.id}:`, sendError);
      } else {
        console.log(`Sent roundup for project ${project.id} to ${recipientEmail}`);
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Error in auto-send-weekly-roundups:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
