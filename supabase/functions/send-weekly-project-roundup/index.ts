import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, clients(name, email)")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Calculate date range (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get tasks for the project
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project_id);

    // Get task activity logs from the past week
    const { data: taskLogs } = await supabase
      .from("task_logs")
      .select("*, tasks(title)")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    // Filter logs for this project's tasks
    const projectTaskIds = allTasks?.map(t => t.id) || [];
    const projectLogs = taskLogs?.filter(log => projectTaskIds.includes(log.task_id)) || [];

    // Categorize tasks
    const completedTasks = allTasks?.filter(t => 
      t.status === "done" && new Date(t.updated_at) >= oneWeekAgo
    ) || [];
    
    const inProgressTasks = allTasks?.filter(t => 
      t.status !== "done" && t.status !== "backlog"
    ) || [];
    
    const overdueTasks = allTasks?.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
    ) || [];

    // Calculate progress percentage
    const totalTasks = allTasks?.length || 1;
    const completedCount = allTasks?.filter(t => t.status === "done").length || 0;
    const progressPercentage = Math.round((completedCount / totalTasks) * 100);

    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: 600; color: #667eea; margin-bottom: 12px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
            .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .progress-bar { background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden; margin: 10px 0; }
            .progress-fill { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; transition: width 0.3s; }
            .task-list { list-style: none; padding: 0; }
            .task-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
            .status-done { background: #d4edda; color: #155724; }
            .status-progress { background: #fff3cd; color: #856404; }
            .status-overdue { background: #f8d7da; color: #721c24; }
            .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 14px; }
            .metric { display: inline-block; margin: 10px 20px; text-align: center; }
            .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
            .metric-label { font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Weekly Project Update</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${project.name}</p>
              <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">
                ${new Date(oneWeekAgo).toLocaleDateString()} - ${new Date().toLocaleDateString()}
              </p>
            </div>
            
            <div class="content">
              <!-- Overview Section -->
              <div class="section">
                <h2 class="section-title">📊 Project Overview</h2>
                <div style="text-align: center; margin: 20px 0;">
                  <div class="metric">
                    <div class="metric-value">${progressPercentage}%</div>
                    <div class="metric-label">Complete</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${completedTasks.length}</div>
                    <div class="metric-label">Tasks Done This Week</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${inProgressTasks.length}</div>
                    <div class="metric-label">In Progress</div>
                  </div>
                </div>
                
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
              </div>

              <!-- Completed Tasks -->
              ${completedTasks.length > 0 ? `
                <div class="section">
                  <h2 class="section-title">✅ Completed This Week</h2>
                  <ul class="task-list">
                    ${completedTasks.slice(0, 5).map(task => `
                      <li class="task-item">
                        <span class="status-badge status-done">Done</span>
                        <strong>${task.title}</strong>
                      </li>
                    `).join('')}
                    ${completedTasks.length > 5 ? `<li class="task-item"><em>...and ${completedTasks.length - 5} more</em></li>` : ''}
                  </ul>
                </div>
              ` : ''}

              <!-- In Progress Tasks -->
              ${inProgressTasks.length > 0 ? `
                <div class="section">
                  <h2 class="section-title">🚀 Currently In Progress</h2>
                  <ul class="task-list">
                    ${inProgressTasks.slice(0, 5).map(task => `
                      <li class="task-item">
                        <span class="status-badge status-progress">${task.status}</span>
                        <strong>${task.title}</strong>
                        ${task.due_date ? `<br><small style="color: #666;">Due: ${new Date(task.due_date).toLocaleDateString()}</small>` : ''}
                      </li>
                    `).join('')}
                    ${inProgressTasks.length > 5 ? `<li class="task-item"><em>...and ${inProgressTasks.length - 5} more</em></li>` : ''}
                  </ul>
                </div>
              ` : ''}

              <!-- Overdue Tasks -->
              ${overdueTasks.length > 0 ? `
                <div class="section">
                  <h2 class="section-title">⚠️ Needs Attention</h2>
                  <ul class="task-list">
                    ${overdueTasks.slice(0, 3).map(task => `
                      <li class="task-item">
                        <span class="status-badge status-overdue">Overdue</span>
                        <strong>${task.title}</strong>
                        <br><small style="color: #721c24;">Due: ${new Date(task.due_date).toLocaleDateString()}</small>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Activity Summary -->
              <div class="section">
                <h2 class="section-title">📈 This Week's Activity</h2>
                <div class="stat-box">
                  <strong>${projectLogs.length}</strong> updates across the project this week
                </div>
              </div>

              <!-- Project Status -->
              <div class="section">
                <h2 class="section-title">📌 Project Status</h2>
                <div class="stat-box">
                  <strong>Current Status:</strong> ${project.status}<br>
                  ${project.due_date ? `<strong>Project Due Date:</strong> ${new Date(project.due_date).toLocaleDateString()}<br>` : ''}
                  <strong>Total Tasks:</strong> ${totalTasks} (${completedCount} completed, ${totalTasks - completedCount} remaining)
                </div>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated weekly project update.</p>
              <p style="color: #999; font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to client
    const clientEmail = project.clients?.email;
    if (!clientEmail) {
      throw new Error("Client email not found");
    }

    const emailResponse = await resend.emails.send({
      from: "Project Updates <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Weekly Update: ${project.name} - ${progressPercentage}% Complete`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Weekly roundup sent successfully",
        email_id: emailResponse.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-project-roundup:", error);
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
