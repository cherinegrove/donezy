import { Task, Project, TimeEntry } from "@/types";

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  averageTaskDuration: number; // hours
  completionVelocity: number; // tasks per week
  burnRate: number; // hours per week
  daysElapsed: number;
  projectedCompletionDays: number;
  actualDueDate: string | null;
  projectedDueDate: string | null;
  variance: number; // days (projected - actual)
  confidence: number; // 0-100
  healthStatus: "on-track" | "at-risk" | "delayed";
  riskFactors: string[];
}

interface DailyMetric {
  date: string;
  tasksCompleted: number;
  hoursLogged: number;
  cumulativeTasksCompleted: number;
  cumulativeHoursLogged: number;
}

// Calculate daily metrics from time entries
function calculateDailyMetrics(
  tasks: Task[],
  timeEntries: TimeEntry[],
  startDate: Date
): DailyMetric[] {
  const days = new Map<string, { tasksCompleted: number; hoursLogged: number }>();

  // Count completed tasks by date
  tasks.forEach((task) => {
    if (task.status === "done" && task.createdAt) {
      const dateKey = new Date(task.createdAt).toISOString().split("T")[0];
      const existing = days.get(dateKey) || { tasksCompleted: 0, hoursLogged: 0 };
      days.set(dateKey, {
        ...existing,
        tasksCompleted: existing.tasksCompleted + 1,
      });
    }
  });

  // Count hours logged by date
  timeEntries.forEach((entry) => {
    const dateKey = new Date(entry.startTime).toISOString().split("T")[0];
    const existing = days.get(dateKey) || { tasksCompleted: 0, hoursLogged: 0 };
    days.set(dateKey, {
      ...existing,
      hoursLogged: existing.hoursLogged + (entry.duration || 0) / 60,
    });
  });

  // Create daily metrics with cumulative values
  const metrics: DailyMetric[] = [];
  let cumulativeTasks = 0;
  let cumulativeHours = 0;

  Array.from(days.entries())
    .sort()
    .forEach(([date, data]) => {
      cumulativeTasks += data.tasksCompleted;
      cumulativeHours += data.hoursLogged;

      metrics.push({
        date,
        tasksCompleted: data.tasksCompleted,
        hoursLogged: data.hoursLogged,
        cumulativeTasksCompleted: cumulativeTasks,
        cumulativeHoursLogged: cumulativeHours,
      });
    });

  return metrics;
}

// Calculate project metrics and predict completion
export function analyzeProjectMetrics(
  project: Project,
  tasks: Task[],
  timeEntries: TimeEntry[]
): ProjectMetrics {
  const now = new Date();
  const startDate = project.startDate ? new Date(project.startDate) : new Date();
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;

  // Basic metrics
  const totalTasks = tasks.filter((t) => t.status !== "done").length + tasks.filter((t) => t.status === "done").length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const completionPercentage = (completedTasks / totalTasks) * 100;

  // Time-based metrics
  const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Duration metrics
  const taskDurations = tasks
    .filter((t) => t.timeEntries && t.timeEntries.length > 0)
    .map((t) => (t.timeEntries || []).reduce((sum, te) => sum + (te.duration || 0) / 60, 0));

  const averageTaskDuration = taskDurations.length > 0 ? taskDurations.reduce((a, b) => a + b) / taskDurations.length : 8;

  // Velocity metrics
  const dailyMetrics = calculateDailyMetrics(tasks, timeEntries, startDate);
  let completionVelocity = 0;
  let burnRate = 0;

  if (dailyMetrics.length >= 7) {
    const lastWeek = dailyMetrics.slice(-7);
    const weekTasks = lastWeek.reduce((sum, m) => sum + m.tasksCompleted, 0);
    const weekHours = lastWeek.reduce((sum, m) => sum + m.hoursLogged, 0);

    completionVelocity = weekTasks;
    burnRate = weekHours;
  } else if (dailyMetrics.length > 0) {
    completionVelocity = (completedTasks / Math.max(1, daysElapsed)) * 7;
    const totalHours = timeEntries.reduce((sum, te) => sum + (te.duration || 0) / 60, 0);
    burnRate = (totalHours / Math.max(1, daysElapsed)) * 7;
  }

  // Prediction
  const remainingTasks = totalTasks - completedTasks;
  const projectedCompletionDays =
    completionVelocity > 0 ? Math.ceil(remainingTasks / completionVelocity) : 999;
  const projectedCompletionDate = new Date(now.getTime() + projectedCompletionDays * 24 * 60 * 60 * 1000);

  // Calculate variance
  let variance = 0;
  let confidence = 50;

  if (dueDate) {
    variance = Math.ceil((projectedCompletionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    // Confidence increases with more data points
    confidence = Math.min(90, 30 + dailyMetrics.length * 5);
  }

  // Determine health status
  let healthStatus: "on-track" | "at-risk" | "delayed" = "on-track";
  const riskFactors: string[] = [];

  if (dueDate) {
    if (variance > 7) {
      healthStatus = "delayed";
      riskFactors.push(`Projected to complete ${variance} days late`);
    } else if (variance > 0) {
      healthStatus = "at-risk";
      riskFactors.push(`Projected to complete ${variance} days late`);
    }
  }

  if (completionVelocity === 0) {
    riskFactors.push("No recent task completions");
    healthStatus = "at-risk";
  }

  if (completionPercentage < (daysElapsed / Math.max(1, daysElapsed + projectedCompletionDays)) * 100) {
    riskFactors.push("Behind schedule for current timeline");
    if (healthStatus === "on-track") {
      healthStatus = "at-risk";
    }
  }

  const projectedDueDateStr = projectedCompletionDate.toISOString().split("T")[0];
  const actualDueDateStr = dueDate ? dueDate.toISOString().split("T")[0] : null;

  return {
    projectId: project.id,
    projectName: project.name,
    totalTasks,
    completedTasks,
    completionPercentage: Math.round(completionPercentage),
    averageTaskDuration: Math.round(averageTaskDuration * 10) / 10,
    completionVelocity: Math.round(completionVelocity * 10) / 10,
    burnRate: Math.round(burnRate * 10) / 10,
    daysElapsed,
    projectedCompletionDays,
    actualDueDate: actualDueDateStr,
    projectedDueDate: projectedDueDateStr,
    variance,
    confidence: Math.round(confidence),
    healthStatus,
    riskFactors,
  };
}

// Predict if a task will miss its deadline
export function predictTaskDeadlineRisk(
  task: Task,
  averageTaskDuration: number
): {
  willMakeDealine: boolean;
  daysUntilDue: number;
  estimatedCompletionDays: number;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
} {
  if (!task.dueDate) {
    return {
      willMakeDealine: true,
      daysUntilDue: 999,
      estimatedCompletionDays: 999,
      riskLevel: "none",
    };
  }

  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Estimate remaining time
  const estimatedHours = task.estimatedHours || averageTaskDuration;
  const loggedHours = (task.timeEntries || []).reduce((sum, te) => sum + (te.duration || 0) / 60, 0);
  const remainingHours = Math.max(0, estimatedHours - loggedHours);
  const estimatedCompletionDays = Math.ceil(remainingHours / 8); // Assume 8-hour workday

  const willMakeDealine = estimatedCompletionDays <= daysUntilDue;

  let riskLevel: "none" | "low" | "medium" | "high" | "critical" = "none";
  if (daysUntilDue <= 0) {
    riskLevel = "critical";
  } else if (estimatedCompletionDays > daysUntilDue) {
    const slack = daysUntilDue - estimatedCompletionDays;
    if (slack < -7) {
      riskLevel = "critical";
    } else if (slack < -2) {
      riskLevel = "high";
    } else if (slack < 0) {
      riskLevel = "medium";
    } else if (slack < 1) {
      riskLevel = "low";
    }
  }

  return {
    willMakeDealine,
    daysUntilDue,
    estimatedCompletionDays,
    riskLevel,
  };
}

export function formatMetricsForDisplay(metrics: ProjectMetrics): string {
  let output = `PROJECT PREDICTIVE ANALYSIS - ${metrics.projectName}\n`;
  output += `═════════════════════════════════════════════\n\n`;

  output += `📊 CURRENT STATUS\n`;
  output += `Completion: ${metrics.completionPercentage}% (${metrics.completedTasks}/${metrics.totalTasks})\n`;
  output += `Days Elapsed: ${metrics.daysElapsed}\n`;
  output += `Velocity: ${metrics.completionVelocity} tasks/week\n`;
  output += `Burn Rate: ${metrics.burnRate}h/week\n\n`;

  output += `🔮 PREDICTION\n`;
  output += `Projected Completion: ${metrics.projectedDueDate} (${metrics.projectedCompletionDays} days)\n`;
  if (metrics.actualDueDate) {
    output += `Actual Due Date: ${metrics.actualDueDate}\n`;
    output += `Variance: ${metrics.variance > 0 ? "+" : ""}${metrics.variance} days\n`;
  }
  output += `Confidence: ${metrics.confidence}%\n`;
  output += `Health: ${metrics.healthStatus.toUpperCase()}\n\n`;

  if (metrics.riskFactors.length > 0) {
    output += `⚠️ RISK FACTORS\n`;
    metrics.riskFactors.forEach((rf) => {
      output += `• ${rf}\n`;
    });
  } else {
    output += `✅ On track - no major risk factors\n`;
  }

  return output;
}
