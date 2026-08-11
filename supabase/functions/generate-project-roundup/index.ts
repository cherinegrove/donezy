import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string | null;
  assigneeId: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    userId: string;
    content: string;
    timestamp: string;
  }>;
  timeEntries: Array<{
    duration: number;
    startTime: string;
    userId: string;
  }>;
}

interface RoundupRequest {
  projectId: string;
  stageId?: string; // if filtering by stage/status
  format?: 'detailed' | 'summary' | 'timeline'; // output format
}

interface TaskSummary {
  title: string;
  status: string;
  progress: number;
  lastUpdate: string;
  lastUpdatedBy: string | null;
  lastComments: Array<{ content: string; author: string; timestamp: string }>;
  dueDate: string | null;
  daysSinceUpdate: number;
  riskFactors: string[];
  isAtRisk: boolean;
  assignee: string | null;
}

interface RoundupResponse {
  projectId: string;
  generatedAt: string;
  tasks: TaskSummary[];
  statistics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    atRiskTasks: number;
    completionPercentage: number;
  };
  clientSummary: string;
  estimatedCompletion: string | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Calculate days since update
function daysSinceUpdate(updatedAt: string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Detect risk factors for a task
function detectRisks(
  task: TaskData,
  now: Date = new Date()
): string[] {
  const risks: string[] = [];

  // Check if overdue
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    if (dueDate < now && task.status !== "done") {
      risks.push(`Overdue by ${Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
    }
  }

  // Check if stale (no updates in 3+ days)
  const days = daysSinceUpdate(task.updatedAt);
  if (days >= 3 && task.status !== "done") {
    risks.push(`No updates for ${days} days`);
  }

  // Check if blocked status
  if (task.status === "blocked" || task.status === "awaiting-feedback") {
    risks.push("Blocked/awaiting");
  }

  // Check if in review with multiple comments (might have delays)
  if (task.status === "review" && task.comments.length > 5) {
    risks.push("Multiple rounds of review");
  }

  return risks;
}

// Get user name by ID
async function getUserName(userId: string): Promise<string> {
  if (!userId) return "Unknown";

  try {
    const { data } = await supabase
      .from("users")
      .select("name")
      .eq("auth_user_id", userId)
      .single();

    return data?.name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// Extract last comments (max 5)
async function extractLastComments(
  comments: TaskData["comments"]
): Promise<Array<{ content: string; author: string; timestamp: string }>> {
  const lastFive = comments.slice(-5).reverse(); // most recent first

  const result = [];
  for (const comment of lastFive) {
    const author = await getUserName(comment.userId);
    result.push({
      content: comment.content.substring(0, 100), // truncate long comments
      author,
      timestamp: new Date(comment.timestamp).toLocaleDateString(),
    });
  }

  return result;
}

// Calculate progress based on time logged vs estimated
function calculateProgress(task: TaskData): number {
  if (!task.timeEntries || task.timeEntries.length === 0) {
    return task.status === "done" ? 100 : 0;
  }

  // If task is done, it's 100%
  if (task.status === "done") {
    return 100;
  }

  // If task is in progress or review, estimate based on activity
  if (["in-progress", "review"].includes(task.status)) {
    return 50; // assume 50% complete if actively being worked on
  }

  // If in todo/backlog with time logged, assume 25%
  if (["todo", "backlog"].includes(task.status) && task.timeEntries.length > 0) {
    return 25;
  }

  return 0;
}

// Fetch all data for a project
async function fetchProjectData(projectId: string): Promise<TaskData[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      due_date,
      assignee_id,
      priority,
      created_at,
      updated_at,
      comments,
      time_entries(duration, start_time, user_id)
    `)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueDate: t.due_date,
    assigneeId: t.assignee_id,
    priority: t.priority,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    comments: t.comments || [],
    timeEntries: t.time_entries || [],
  }));
}

// Generate task summaries
async function generateTaskSummaries(tasks: TaskData[]): Promise<TaskSummary[]> {
  const summaries: TaskSummary[] = [];

  for (const task of tasks) {
    const now = new Date();
    const lastComments = await extractLastComments(task.comments);
    const assigneeName = await getUserName(task.assigneeId || "");
    const riskFactors = detectRisks(task, now);

    summaries.push({
      title: task.title,
      status: task.status,
      progress: calculateProgress(task),
      lastUpdate: new Date(task.updatedAt).toLocaleDateString(),
      lastUpdatedBy: assigneeName === "Unknown" ? null : assigneeName,
      lastComments,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null,
      daysSinceUpdate: daysSinceUpdate(task.updatedAt),
      riskFactors,
      isAtRisk: riskFactors.length > 0 || (task.dueDate && new Date(task.dueDate) < now),
      assignee: assigneeName === "Unknown" ? null : assigneeName,
    });
  }

  return summaries;
}

// Generate client-friendly summary narrative
function generateClientSummary(
  taskSummaries: TaskSummary[],
  stats: RoundupResponse["statistics"]
): string {
  const completed = taskSummaries.filter(t => t.status === "done").length;
  const inProgress = taskSummaries.filter(t => t.status === "in-progress").length;
  const atRisk = taskSummaries.filter(t => t.isAtRisk).length;

  let summary = `PROJECT STATUS SUMMARY\n`;
  summary += `═══════════════════════════════════════════\n\n`;

  summary += `Overall Progress: ${stats.completionPercentage}% Complete (${completed}/${stats.totalTasks} tasks done)\n\n`;

  if (completed > 0) {
    summary += `✅ COMPLETED (${completed})\n`;
    const doneTasks = taskSummaries
      .filter(t => t.status === "done")
      .slice(0, 3);
    for (const task of doneTasks) {
      summary += `   • ${task.title}\n`;
    }
    if (completed > 3) {
      summary += `   • ... and ${completed - 3} more\n`;
    }
    summary += `\n`;
  }

  if (inProgress > 0) {
    summary += `⏳ IN PROGRESS (${inProgress})\n`;
    const progTasks = taskSummaries
      .filter(t => t.status === "in-progress")
      .slice(0, 3);
    for (const task of progTasks) {
      summary += `   • ${task.title} (${task.progress}% done)\n`;
    }
    if (inProgress > 3) {
      summary += `   • ... and ${inProgress - 3} more\n`;
    }
    summary += `\n`;
  }

  if (atRisk > 0) {
    summary += `🚨 AT RISK (${atRisk})\n`;
    const riskTasks = taskSummaries.filter(t => t.isAtRisk).slice(0, 3);
    for (const task of riskTasks) {
      const risks = task.riskFactors.join(", ");
      summary += `   • ${task.title}\n`;
      summary += `     └─ ${risks}\n`;
    }
    if (atRisk > 3) {
      summary += `   • ... and ${atRisk - 3} more at risk\n`;
    }
    summary += `\n`;
  }

  summary += `For detailed breakdowns of each task, use the detailed report.\n`;

  return summary;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { projectId, format = "summary" } = (await req.json()) as RoundupRequest;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Missing projectId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all tasks for the project
    const tasks = await fetchProjectData(projectId);

    if (tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tasks found for this project" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate summaries
    const taskSummaries = await generateTaskSummaries(tasks);

    // Calculate statistics
    const completed = taskSummaries.filter(t => t.status === "done").length;
    const inProgress = taskSummaries.filter(t => t.status === "in-progress").length;
    const blocked = taskSummaries.filter(t => t.status === "blocked").length;
    const atRisk = taskSummaries.filter(t => t.isAtRisk).length;

    const statistics = {
      totalTasks: taskSummaries.length,
      completedTasks: completed,
      inProgressTasks: inProgress,
      blockedTasks: blocked,
      atRiskTasks: atRisk,
      completionPercentage: Math.round((completed / taskSummaries.length) * 100),
    };

    // Generate client summary
    const clientSummary = generateClientSummary(taskSummaries, statistics);

    // Estimate completion date (based on in-progress tasks with due dates)
    const dueDateTasks = taskSummaries
      .filter(t => t.dueDate && t.status !== "done")
      .map(t => new Date(t.dueDate!));
    const estimatedCompletion =
      dueDateTasks.length > 0
        ? new Date(Math.max(...dueDateTasks.map(d => d.getTime())))
            .toLocaleDateString()
        : null;

    const response: RoundupResponse = {
      projectId,
      generatedAt: new Date().toISOString(),
      tasks: taskSummaries,
      statistics,
      clientSummary,
      estimatedCompletion,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Roundup generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
