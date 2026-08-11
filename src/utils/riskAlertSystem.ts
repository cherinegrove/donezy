import { Task, Project, User, TimeEntry } from "@/types";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertType =
  | "deadline_at_risk"
  | "no_progress"
  | "scope_creep"
  | "overwork"
  | "key_person_risk"
  | "blocked_dependency"
  | "milestone_missed";

export interface Alert {
  id: string;
  projectId: string;
  taskId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  daysUntilImpact: number;
  createdAt: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface RiskScore {
  projectId: string;
  projectName: string;
  overallRisk: number; // 0-100
  alerts: Alert[];
  predictions: string[];
  healthStatus: "healthy" | "at_risk" | "critical";
}

// Calculate deadline risk score
function calculateDeadlineRisk(
  task: Task,
  now: Date = new Date()
): { score: number; alert?: Alert } {
  if (task.status === "done" || !task.dueDate) {
    return { score: 0 };
  }

  const dueDate = new Date(task.dueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let score = 0;
  let alert: Alert | undefined;

  if (daysUntilDue < 0) {
    // Overdue
    score = 100;
    alert = {
      id: `alert-overdue-${task.id}`,
      projectId: task.projectId,
      taskId: task.id,
      type: "deadline_at_risk",
      severity: "critical",
      title: `OVERDUE: ${task.title}`,
      description: `Task "${task.title}" is ${Math.abs(daysUntilDue)} days overdue and still not completed`,
      suggestedAction: `Complete "${task.title}" immediately or renegotiate deadline`,
      daysUntilImpact: 0,
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  } else if (daysUntilDue <= 1) {
    // Due today or tomorrow
    score = 90;
    alert = {
      id: `alert-due-soon-${task.id}`,
      projectId: task.projectId,
      taskId: task.id,
      type: "deadline_at_risk",
      severity: "critical",
      title: `DUE SOON: ${task.title}`,
      description: `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
      suggestedAction: `Drop everything and finish "${task.title}" by deadline`,
      daysUntilImpact: daysUntilDue,
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  } else if (daysUntilDue <= 3) {
    // Due soon (3 days)
    const progress = task.timeEntries?.length || 0 > 0 ? 50 : 0;
    if (progress < 50) {
      score = 75;
      alert = {
        id: `alert-due-3d-${task.id}`,
        projectId: task.projectId,
        taskId: task.id,
        type: "deadline_at_risk",
        severity: "high",
        title: `AT RISK: ${task.title}`,
        description: `Task "${task.title}" due in 3 days with minimal progress`,
        suggestedAction: `Focus team on "${task.title}" to avoid missing deadline`,
        daysUntilImpact: 3,
        createdAt: now.toISOString(),
        acknowledged: false,
      };
    }
  } else if (daysUntilDue <= 7 && task.status === "todo") {
    // Todo and due within 7 days
    score = 50;
    alert = {
      id: `alert-due-week-${task.id}`,
      projectId: task.projectId,
      taskId: task.id,
      type: "deadline_at_risk",
      severity: "medium",
      title: `NOT STARTED: ${task.title}`,
      description: `Task "${task.title}" is not started and due in ${daysUntilDue} days`,
      suggestedAction: `Start "${task.title}" immediately to make deadline`,
      daysUntilImpact: daysUntilDue,
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  }

  return { score, alert };
}

// Detect no progress (stale task)
function calculateStaleTaskRisk(task: Task, now: Date = new Date()): { score: number; alert?: Alert } {
  if (task.status === "done") {
    return { score: 0 };
  }

  const lastUpdate = new Date(task.createdAt);
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  let score = 0;
  let alert: Alert | undefined;

  if (daysSinceUpdate >= 7 && task.status !== "done") {
    score = 70;
    alert = {
      id: `alert-stale-${task.id}`,
      projectId: task.projectId,
      taskId: task.id,
      type: "no_progress",
      severity: "high",
      title: `STALE: ${task.title}`,
      description: `No updates to "${task.title}" for ${daysSinceUpdate} days`,
      suggestedAction: `Check on "${task.title}" - may be stuck or deprioritized`,
      daysUntilImpact: daysSinceUpdate,
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  } else if (daysSinceUpdate >= 3) {
    score = 40;
  }

  return { score, alert };
}

// Detect scope creep
function detectScopeCreep(
  project: Project,
  tasks: Task[],
  now: Date = new Date()
): { score: number; alert?: Alert } {
  if (!project.dueDate) {
    return { score: 0 };
  }

  const startDate = project.startDate ? new Date(project.startDate) : new Date();
  const dueDate = new Date(project.dueDate);
  const projectDuration = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Count tasks added recently
  const recentTasksAdded = tasks.filter((t) => {
    const taskDate = new Date(t.createdAt);
    const daysSinceCreated = Math.floor((now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreated <= 7; // Added in last week
  }).length;

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const completionRate = completedTasks / totalTasks;
  const timeElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const expectedCompletion = timeElapsed / projectDuration;

  let score = 0;
  let alert: Alert | undefined;

  // Scope creep: adding tasks while behind schedule
  if (recentTasksAdded > 2 && completionRate < expectedCompletion) {
    score = 60;
    alert = {
      id: `alert-scope-creep-${project.id}`,
      projectId: project.id,
      type: "scope_creep",
      severity: "medium",
      title: `SCOPE CREEP: ${project.name}`,
      description: `${recentTasksAdded} tasks added recently while project is behind schedule`,
      suggestedAction: `Freeze scope or extend deadline - current pace won't meet deadline`,
      daysUntilImpact: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  }

  return { score, alert };
}

// Detect overwork
function detectOverwork(
  userId: string,
  tasks: Task[],
  timeEntries: TimeEntry[],
  now: Date = new Date()
): { score: number; alert?: Alert } {
  // Hours logged this week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekHours = timeEntries
    .filter((te) => {
      const entryDate = new Date(te.startTime);
      return entryDate >= weekStart && te.userId === userId;
    })
    .reduce((sum, te) => sum + (te.duration || 0) / 60, 0);

  let score = 0;
  let alert: Alert | undefined;

  if (thisWeekHours > 50) {
    score = 80;
    alert = {
      id: `alert-overwork-${userId}`,
      projectId: "", // Would need to be enhanced
      type: "overwork",
      severity: "high",
      title: `OVERWORK: Team member logged ${Math.round(thisWeekHours)}h`,
      description: `This person logged ${Math.round(thisWeekHours)} hours this week (40h is normal)`,
      suggestedAction: `Reduce workload immediately - unsustainable pace`,
      daysUntilImpact: 7,
      createdAt: now.toISOString(),
      acknowledged: false,
    };
  } else if (thisWeekHours > 45) {
    score = 50;
  }

  return { score, alert };
}

export function analyzeProjectRisks(
  project: Project,
  tasks: Task[],
  users: User[],
  timeEntries: TimeEntry[]
): RiskScore {
  const now = new Date();
  const alerts: Alert[] = [];
  let totalRiskScore = 0;

  // Analyze deadline risks
  tasks.forEach((task) => {
    const { score, alert } = calculateDeadlineRisk(task, now);
    totalRiskScore += score / tasks.length;
    if (alert) alerts.push(alert);
  });

  // Analyze stale tasks
  tasks.forEach((task) => {
    const { score, alert } = calculateStaleTaskRisk(task, now);
    totalRiskScore += score / tasks.length;
    if (alert) alerts.push(alert);
  });

  // Analyze scope creep
  const { score: scopeScore, alert: scopeAlert } = detectScopeCreep(project, tasks, now);
  totalRiskScore += scopeScore / 10;
  if (scopeAlert) alerts.push(scopeAlert);

  // Analyze overwork
  users.forEach((user) => {
    const { score, alert } = detectOverwork(user.id, tasks, timeEntries, now);
    totalRiskScore += score / users.length;
    if (alert) alerts.push(alert);
  });

  // Normalize risk score to 0-100
  const overallRisk = Math.min(100, Math.round(totalRiskScore));

  // Generate predictions
  const predictions: string[] = [];
  if (overallRisk >= 75) {
    predictions.push("Project deadline is at significant risk");
    predictions.push("Recommend immediate escalation and mitigation");
  } else if (overallRisk >= 50) {
    predictions.push("Project has several risk factors that need attention");
    predictions.push("Monitor closely and take preventive action");
  } else if (overallRisk >= 25) {
    predictions.push("Project has minor risks - maintain focus on deadlines");
  } else {
    predictions.push("Project is on track");
  }

  const healthStatus = overallRisk >= 75 ? "critical" : overallRisk >= 50 ? "at_risk" : "healthy";

  // Sort alerts by severity
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    projectId: project.id,
    projectName: project.name,
    overallRisk,
    alerts: alerts.slice(0, 10), // Top 10 alerts
    predictions,
    healthStatus,
  };
}

export function formatRisksForDisplay(riskScore: RiskScore): string {
  const statusEmoji =
    riskScore.healthStatus === "critical"
      ? "🚨"
      : riskScore.healthStatus === "at_risk"
        ? "⚠️"
        : "✅";

  let output = `PROJECT RISK ANALYSIS - ${riskScore.projectName}\n`;
  output += `═══════════════════════════════════════════\n\n`;
  output += `${statusEmoji} OVERALL RISK: ${riskScore.overallRisk}/100\n`;
  output += `Status: ${riskScore.healthStatus.toUpperCase()}\n\n`;

  if (riskScore.alerts.length > 0) {
    output += `ACTIVE ALERTS (${riskScore.alerts.length}):\n`;
    riskScore.alerts.forEach((alert) => {
      const emoji =
        alert.severity === "critical"
          ? "🚨"
          : alert.severity === "high"
            ? "⚠️"
            : alert.severity === "medium"
              ? "⏳"
              : "ℹ️";
      output += `\n${emoji} ${alert.title}\n`;
      output += `   ${alert.description}\n`;
      output += `   → ${alert.suggestedAction}\n`;
    });
  } else {
    output += `✅ No active alerts\n`;
  }

  if (riskScore.predictions.length > 0) {
    output += `\n\nPREDICTIONS:\n`;
    riskScore.predictions.forEach((pred) => {
      output += `• ${pred}\n`;
    });
  }

  return output;
}
