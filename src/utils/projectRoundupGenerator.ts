import { Project, Task, User, Comment } from "@/types";

export interface TaskSummary {
  taskId: string;
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

export interface ProjectRoundupData {
  projectId: string;
  projectName: string;
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
  emailSummary: string;
  estimatedCompletion: string | null;
}

function daysSinceUpdate(updatedAt: string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function detectRisks(task: Task, now: Date = new Date()): string[] {
  const risks: string[] = [];

  // Check if overdue
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    if (dueDate < now && task.status !== "done") {
      const daysOverdue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      risks.push(`Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`);
    }
  }

  // Check if stale (no updates in 3+ days)
  const days = daysSinceUpdate(task.createdAt);
  if (days >= 3 && task.status !== "done") {
    risks.push(`No updates for ${days} days`);
  }

  // Check if blocked status
  if (
    task.status === "blocked" ||
    task.status === "awaiting-feedback" ||
    task.status === "review"
  ) {
    risks.push("Blocked/awaiting");
  }

  return risks;
}

function calculateProgress(task: Task): number {
  if (task.status === "done") {
    return 100;
  }

  if (["in-progress", "review"].includes(task.status)) {
    return 50;
  }

  if (["todo", "backlog"].includes(task.status)) {
    return 0;
  }

  return 25;
}

export function generateProjectRoundup(
  project: Project,
  projectTasks: Task[],
  users: User[]
): ProjectRoundupData {
  const now = new Date();
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Generate task summaries
  const taskSummaries: TaskSummary[] = projectTasks.map((task) => {
    const riskFactors = detectRisks(task, now);
    const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;
    const lastFiveComments = (task.comments || [])
      .slice(-5)
      .reverse()
      .map((comment: Comment) => {
        const author = userMap.get(comment.userId);
        return {
          content: comment.content.substring(0, 80),
          author: author?.name || "Unknown",
          timestamp: new Date(comment.timestamp).toLocaleDateString(),
        };
      });

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      progress: calculateProgress(task),
      lastUpdate: new Date(task.createdAt).toLocaleDateString(),
      lastUpdatedBy: assignee?.name || null,
      lastComments: lastFiveComments,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null,
      daysSinceUpdate: daysSinceUpdate(task.createdAt),
      riskFactors,
      isAtRisk: riskFactors.length > 0,
      assignee: assignee?.name || null,
    };
  });

  // Calculate statistics
  const completed = taskSummaries.filter((t) => t.status === "done").length;
  const inProgress = taskSummaries.filter((t) => t.status === "in-progress").length;
  const blocked = taskSummaries.filter((t) => t.status === "blocked").length;
  const atRisk = taskSummaries.filter((t) => t.isAtRisk).length;

  const statistics = {
    totalTasks: taskSummaries.length,
    completedTasks: completed,
    inProgressTasks: inProgress,
    blockedTasks: blocked,
    atRiskTasks: atRisk,
    completionPercentage:
      taskSummaries.length > 0
        ? Math.round((completed / taskSummaries.length) * 100)
        : 0,
  };

  // Generate client summary
  const clientSummary = generateClientSummary(
    taskSummaries,
    statistics,
    project.name
  );

  // Generate email summary
  const emailSummary = generateEmailSummary(
    taskSummaries,
    project.name
  );

  // Estimate completion
  const dueDateTasks = taskSummaries
    .filter((t) => t.dueDate && t.status !== "done")
    .map((t) => new Date(t.dueDate!));
  const estimatedCompletion =
    dueDateTasks.length > 0
      ? new Date(Math.max(...dueDateTasks.map((d) => d.getTime()))).toLocaleDateString()
      : null;

  return {
    projectId: project.id,
    projectName: project.name,
    generatedAt: new Date().toISOString(),
    tasks: taskSummaries,
    statistics,
    clientSummary,
    emailSummary,
    estimatedCompletion,
  };
}

function generateClientSummary(
  tasks: TaskSummary[],
  stats: ProjectRoundupData["statistics"],
  projectName: string
): string {
  const completed = tasks.filter((t) => t.status === "done");
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const atRisk = tasks.filter((t) => t.isAtRisk);

  let summary = `PROJECT STATUS - ${projectName.toUpperCase()}\n`;
  summary += `Generated: ${new Date().toLocaleDateString()}\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  summary += `OVERALL PROGRESS: ${stats.completionPercentage}%\n`;
  summary += `${completed.length}/${stats.totalTasks} tasks complete\n\n`;

  if (completed.length > 0) {
    summary += `✅ COMPLETED (${completed.length})\n`;
    completed.slice(0, 3).forEach((task) => {
      summary += `   • ${task.title}\n`;
    });
    if (completed.length > 3) {
      summary += `   • ... and ${completed.length - 3} more\n`;
    }
    summary += `\n`;
  }

  if (inProgress.length > 0) {
    summary += `⏳ IN PROGRESS (${inProgress.length})\n`;
    inProgress.slice(0, 3).forEach((task) => {
      summary += `   • ${task.title} (${task.progress}%)\n`;
    });
    if (inProgress.length > 3) {
      summary += `   • ... and ${inProgress.length - 3} more\n`;
    }
    summary += `\n`;
  }

  if (atRisk.length > 0) {
    summary += `⚠️ AT RISK (${atRisk.length})\n`;
    atRisk.slice(0, 3).forEach((task) => {
      const risks = task.riskFactors.join(", ");
      summary += `   • ${task.title}\n     └─ ${risks}\n`;
    });
    if (atRisk.length > 3) {
      summary += `   • ... and ${atRisk.length - 3} more\n`;
    }
  }

  return summary;
}

function generateEmailSummary(
  tasks: TaskSummary[],
  projectName: string
): string {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "done") return false;
    const taskDate = new Date(t.lastUpdate);
    return taskDate >= oneWeekAgo;
  });

  const newTasks = tasks.filter((t) => {
    const taskDate = new Date(t.lastUpdate);
    return taskDate >= oneWeekAgo && t.status !== "done";
  });

  const currentlyActive = tasks.filter(
    (t) => t.status === "in-progress" || t.status === "review"
  );

  const awaitingFeedback = tasks.filter((t) =>
    ["blocked", "awaiting-feedback", "review"].includes(t.status)
  );

  let email = `<html>\n<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">\n`;
  email += `<h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">${projectName} - Weekly Update</h2>\n`;
  email += `<p style="color: #666; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>\n`;

  // Completed this week
  if (completedThisWeek.length > 0) {
    email += `\n<h3 style="color: #27ae60; margin-top: 20px;">✅ Tasks Completed This Week</h3>\n`;
    email += `<ul style="margin: 10px 0;">\n`;
    completedThisWeek.forEach((task) => {
      email += `  <li style="margin: 8px 0;">${task.title}</li>\n`;
    });
    email += `</ul>\n`;
  }

  // New tasks
  if (newTasks.length > 0) {
    email += `\n<h3 style="color: #3498db; margin-top: 20px;">📋 New Tasks</h3>\n`;
    email += `<ul style="margin: 10px 0;">\n`;
    newTasks.forEach((task) => {
      email += `  <li style="margin: 8px 0;"><strong>${task.title}</strong>\n`;
      if (task.assignee) {
        email += `    <br/><span style="color: #666; font-size: 13px;">Assigned to: ${task.assignee}</span>\n`;
      }
      email += `  </li>\n`;
    });
    email += `</ul>\n`;
  }

  // Currently Active
  if (currentlyActive.length > 0) {
    email += `\n<h3 style="color: #f39c12; margin-top: 20px;">⏳ Currently Active</h3>\n`;
    email += `<ul style="margin: 10px 0;">\n`;
    currentlyActive.forEach((task) => {
      email += `  <li style="margin: 8px 0;"><strong>${task.title}</strong> (${task.progress}% complete)\n`;
      if (task.assignee) {
        email += `    <br/><span style="color: #666; font-size: 13px;">Working: ${task.assignee}</span>\n`;
      }
      email += `  </li>\n`;
    });
    email += `</ul>\n`;
  }

  // Awaiting Feedback
  if (awaitingFeedback.length > 0) {
    email += `\n<h3 style="color: #e74c3c; margin-top: 20px;">⏸️ Awaiting Feedback</h3>\n`;
    email += `<div style="margin: 10px 0;">\n`;
    awaitingFeedback.forEach((task) => {
      email += `<div style="background-color: #f9f9f9; padding: 12px; margin: 10px 0; border-left: 4px solid #e74c3c; border-radius: 4px;">\n`;
      email += `  <strong style="color: #2c3e50;">${task.title}</strong>\n`;

      if (task.lastComments && task.lastComments.length > 0) {
        email += `  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">\n`;
        email += `    <p style="margin: 0; font-size: 13px; color: #666; font-weight: bold;">Latest Updates:</p>\n`;
        task.lastComments.slice(0, 2).forEach((comment) => {
          email += `    <p style="margin: 6px 0; font-size: 12px; color: #555;"><strong>${comment.author}</strong> (${comment.timestamp}):<br/>${comment.content}</p>\n`;
        });
        email += `  </div>\n`;
      }
      email += `</div>\n`;
    });
    email += `</div>\n`;
  }

  email += `\n<hr style="border: none; border-top: 1px solid #ddd; margin-top: 30px;" />\n`;
  email += `<p style="color: #666; font-size: 12px; margin-top: 20px;">Questions or need more details? Please reach out!</p>\n`;
  email += `</body>\n</html>`;

  return email;
}
