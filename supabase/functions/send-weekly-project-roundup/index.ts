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

    // Build detailed sections
    let backlogSection = "";
    if (backlogTasks.length > 0) {
      backlogSection = "<h3>📋 Backlog Tasks</h3><ul>";
      backlogTasks.forEach((task: any) => {
        backlogSection += `<li><strong>${task.title}</strong>`;
        if (task.backlog_reason) {
          backlogSection += `<br/><em>Reason: ${task.backlog_reason}</em>`;
        }
        backlogSection += `</li>`;
      });
      backlogSection += "</ul>";
    }

    let inProgressSection = "";
    if (inProgressTasks.length > 0) {
      inProgressSection = "<h3>🚀 In Progress</h3><ul>";
      inProgressTasks.forEach((task: any) => {
        inProgressSection += `<li><strong>${task.title}</strong>`;
        if (task.due_date) {
          inProgressSection += `<br/>Due: ${new Date(task.due_date).toLocaleDateString()}`;
        }
        if (task.due_date_change_reason) {
          inProgressSection += `<br/><em>Due date changed: ${task.due_date_change_reason}</em>`;
        }
        inProgressSection += `</li>`;
      });
      inProgressSection += "</ul>";
    }

    let awaitingFeedbackSection = "";
    if (awaitingFeedbackTasks.length > 0) {
      awaitingFeedbackSection = "<h3>⏳ Awaiting Feedback</h3><ul>";
      awaitingFeedbackTasks.forEach((task: any) => {
        awaitingFeedbackSection += `<li><strong>${task.title}</strong>`;
        if (task.awaiting_feedback_details) {
          awaitingFeedbackSection += `<br/><em>Waiting for: ${task.awaiting_feedback_details}</em>`;
        }
        awaitingFeedbackSection += `</li>`;
      });
      awaitingFeedbackSection += "</ul>";
    }

    let completedSection = "";
    if (completedThisWeek.length > 0) {
      completedSection = "<h3>✅ Completed This Week</h3><ul>";
      completedThisWeek.forEach((task: any) => {
        completedSection += `<li><strong>${task.title}</strong></li>`;
      });
      completedSection += "</ul>";
    }

    let addedSection = "";
    if (addedThisWeek.length > 0) {
      addedSection = "<h3>🆕 Added This Week</h3><ul>";
      addedThisWeek.forEach((task: any) => {
        addedSection += `<li><strong>${task.title}</strong>`;
        if (task.description) {
          addedSection += `<br/>${task.description}`;
        }
        addedSection += `</li>`;
      });
      addedSection += "</ul>";
    }

    // Generate email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px;">
          Weekly Project Update: ${project.name}
        </h1>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">📊 Project Overview</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #92400E;">${stats.backlogCount}</div>
              <div style="color: #78350F; font-size: 14px;">Backlog</div>
            </div>
            <div style="background-color: #DBEAFE; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #1E40AF;">${stats.inProgressCount}</div>
              <div style="color: #1E3A8A; font-size: 14px;">In Progress</div>
            </div>
            <div style="background-color: #FED7AA; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #C2410C;">${stats.awaitingFeedbackCount}</div>
              <div style="color: #9A3412; font-size: 14px;">Awaiting Feedback</div>
            </div>
            <div style="background-color: #D1FAE5; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #065F46;">${stats.completedThisWeek}</div>
              <div style="color: #064E3B; font-size: 14px;">Completed</div>
            </div>
            <div style="background-color: #E9D5FF; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #6B21A8;">${stats.addedThisWeek}</div>
              <div style="color: #581C87; font-size: 14px;">Added</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 30px;">
          ${backlogSection}
          ${inProgressSection}
          ${awaitingFeedbackSection}
          ${completedSection}
          ${addedSection}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          <p>This is an automated weekly update for project: ${project.name}</p>
          <p>If you have any questions or concerns, please don't hesitate to reach out.</p>
        </div>
      </div>
    `;

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

    // Generate text summary for copying
    const textSummary = `
WEEKLY PROJECT UPDATE
Project: ${project.name}
Period: ${new Date(oneWeekAgo).toLocaleDateString()} - ${new Date().toLocaleDateString()}

OVERVIEW
- Progress: ${progressPercentage}% Complete
- Completed This Week: ${completedTasks.length} tasks
- Currently In Progress: ${inProgressTasks.length} tasks
- Total Activity: ${projectLogs.length} updates

${completedTasks.length > 0 ? `COMPLETED THIS WEEK
${completedTasks.map(t => `✓ ${t.title}`).join('\n')}
` : ''}

${inProgressTasks.length > 0 ? `IN PROGRESS
${inProgressTasks.map(t => `• ${t.title}${t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleDateString()})` : ''}`).join('\n')}
` : ''}

${overdueTasks.length > 0 ? `NEEDS ATTENTION
${overdueTasks.map(t => `⚠ ${t.title} (Overdue: ${new Date(t.due_date).toLocaleDateString()})`).join('\n')}
` : ''}

PROJECT STATUS
Current Status: ${project.status}
${project.due_date ? `Project Due Date: ${new Date(project.due_date).toLocaleDateString()}` : ''}
Total Tasks: ${totalTasks} (${completedCount} completed, ${totalTasks - completedCount} remaining)
    `.trim();

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
