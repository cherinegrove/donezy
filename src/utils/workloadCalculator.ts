import { Task, User, TimeEntry } from "@/types";

export interface TaskWorkload {
  taskId: string;
  taskTitle: string;
  estimatedHours: number;
  hoursLogged: number;
  hoursRemaining: number;
  status: string;
  dueDate?: string;
}

export interface UserWorkload {
  userId: string;
  userName: string;
  tasksCount: number;
  tasksInProgress: number;
  estimatedHoursRemaining: number;
  hoursLoggedThisWeek: number;
  utilizationPercentage: number;
  isOverbooked: boolean;
  availableCapacity: number;
  riskFactors: string[];
  assignedTasks: TaskWorkload[];
}

export interface TeamWorkloadSummary {
  teamSize: number;
  averageUtilization: number;
  overbookedCount: number;
  atCapacityCount: number;
  underutilizedCount: number;
  totalAvailableCapacity: number;
  users: UserWorkload[];
  recommendations: string[];
}

const WEEKLY_CAPACITY_HOURS = 40;

export function calculateUserWorkload(
  userId: string,
  userName: string,
  userTasks: Task[],
  timeEntries: TimeEntry[]
): UserWorkload {
  // Calculate this week's hours logged
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekTimeEntries = timeEntries.filter((te) => {
    const entryDate = new Date(te.startTime);
    return entryDate >= weekStart && te.userId === userId;
  });

  const hoursLoggedThisWeek = thisWeekTimeEntries.reduce(
    (sum, te) => sum + (te.duration || 0) / 60,
    0
  );

  // Calculate workload from assigned tasks
  let estimatedHoursRemaining = 0;
  let tasksInProgress = 0;
  const assignedTasks: TaskWorkload[] = [];

  userTasks.forEach((task) => {
    if (task.status === "done") return;

    const hoursLogged = task.timeEntries
      ?.reduce((sum, te) => sum + (te.duration || 0) / 60, 0) || 0;
    const estimatedHours = task.estimatedHours || 4; // Default to 4 hours if not set
    const hoursRemaining = Math.max(0, estimatedHours - hoursLogged);

    if (task.status === "in-progress") {
      tasksInProgress++;
    }

    if (hoursRemaining > 0) {
      estimatedHoursRemaining += hoursRemaining;
    }

    assignedTasks.push({
      taskId: task.id,
      taskTitle: task.title,
      estimatedHours,
      hoursLogged,
      hoursRemaining,
      status: task.status,
      dueDate: task.dueDate,
    });
  });

  const totalAllocatedHours = hoursLoggedThisWeek + estimatedHoursRemaining;
  const utilizationPercentage = Math.round(
    (totalAllocatedHours / WEEKLY_CAPACITY_HOURS) * 100
  );
  const availableCapacity = Math.max(0, WEEKLY_CAPACITY_HOURS - totalAllocatedHours);
  const isOverbooked = totalAllocatedHours > WEEKLY_CAPACITY_HOURS;

  // Detect risk factors
  const riskFactors: string[] = [];
  if (isOverbooked) {
    riskFactors.push(`${Math.round(totalAllocatedHours - WEEKLY_CAPACITY_HOURS)}h overbooked`);
  }
  if (utilizationPercentage > 80) {
    riskFactors.push("No buffer time");
  }
  if (tasksInProgress > 3) {
    riskFactors.push("Too many concurrent tasks");
  }

  return {
    userId,
    userName,
    tasksCount: userTasks.filter((t) => t.status !== "done").length,
    tasksInProgress,
    estimatedHoursRemaining,
    hoursLoggedThisWeek,
    utilizationPercentage,
    isOverbooked,
    availableCapacity,
    riskFactors,
    assignedTasks,
  };
}

export function calculateTeamWorkload(
  users: User[],
  tasks: Task[],
  timeEntries: TimeEntry[]
): TeamWorkloadSummary {
  const userWorkloads = users.map((user) => {
    const userTasks = tasks.filter(
      (t) => t.assigneeId === user.id || t.assigneeId === user.auth_user_id
    );
    return calculateUserWorkload(user.id, user.name, userTasks, timeEntries);
  });

  const overbookedCount = userWorkloads.filter((u) => u.isOverbooked).length;
  const atCapacityCount = userWorkloads.filter(
    (u) => u.utilizationPercentage >= 80 && u.utilizationPercentage <= 100
  ).length;
  const underutilizedCount = userWorkloads.filter(
    (u) => u.utilizationPercentage < 60 && u.availableCapacity > 5
  ).length;

  const averageUtilization = Math.round(
    userWorkloads.reduce((sum, u) => sum + u.utilizationPercentage, 0) /
      userWorkloads.length
  );

  const totalAvailableCapacity = userWorkloads.reduce(
    (sum, u) => sum + u.availableCapacity,
    0
  );

  // Generate recommendations
  const recommendations: string[] = [];

  if (overbookedCount > 0) {
    recommendations.push(
      `${overbookedCount} team member${overbookedCount > 1 ? "s" : ""} ${overbookedCount > 1 ? "are" : "is"} overbooked - consider rebalancing`
    );
  }

  const overbooked = userWorkloads.filter((u) => u.isOverbooked);
  const underbooked = userWorkloads.filter((u) => u.availableCapacity > 10);

  if (overbooked.length > 0 && underbooked.length > 0) {
    const moveHours = Math.min(
      Math.round(overbooked[0].estimatedHoursRemaining * 0.2), // Move 20% of first overbooked person's work
      Math.round(underbooked[0].availableCapacity * 0.5) // To 50% of underbooked person's capacity
    );
    if (moveHours > 0) {
      recommendations.push(
        `Move ${moveHours}h from ${overbooked[0].userName} to ${underbooked[0].userName}`
      );
    }
  }

  if (underutilizedCount > 0) {
    recommendations.push(
      `${underutilizedCount} team member${underutilizedCount > 1 ? "s" : ""} ${underutilizedCount > 1 ? "have" : "has"} available capacity - consider pairing or training`
    );
  }

  const tasksWithoutAssignee = userWorkloads.reduce(
    (sum, u) => sum + u.assignedTasks.filter((t) => t.status === "todo").length,
    0
  );
  if (tasksWithoutAssignee > 3) {
    recommendations.push(
      `${tasksWithoutAssignee} unstarted tasks waiting - prioritize blocking dependencies`
    );
  }

  return {
    teamSize: userWorkloads.length,
    averageUtilization,
    overbookedCount,
    atCapacityCount,
    underutilizedCount,
    totalAvailableCapacity,
    users: userWorkloads,
    recommendations,
  };
}

export function formatWorkloadForDisplay(workload: UserWorkload): string {
  const utilizationBar =
    "█".repeat(Math.floor(workload.utilizationPercentage / 10)) +
    "░".repeat(10 - Math.floor(workload.utilizationPercentage / 10));

  let output = `${workload.userName}\n`;
  output += `${utilizationBar} ${workload.utilizationPercentage}%\n`;
  output += `Tasks: ${workload.tasksInProgress}/${workload.tasksCount} in progress\n`;
  output += `Logged: ${Math.round(workload.hoursLoggedThisWeek)}h | Remaining: ${Math.round(workload.estimatedHoursRemaining)}h | Available: ${Math.round(workload.availableCapacity)}h\n`;

  if (workload.riskFactors.length > 0) {
    output += `⚠️ ${workload.riskFactors.join(" | ")}\n`;
  }

  return output;
}

export function formatTeamWorkloadForDisplay(summary: TeamWorkloadSummary): string {
  let output = `TEAM CAPACITY REPORT\n`;
  output += `═══════════════════════════════════════════\n\n`;

  output += `📊 TEAM UTILIZATION\n`;
  output += `Average: ${summary.averageUtilization}% | `;
  output += `Overbooked: ${summary.overbookedCount} | `;
  output += `At Capacity: ${summary.atCapacityCount} | `;
  output += `Available: ${summary.underutilizedCount}\n`;
  output += `Total Available Capacity: ${Math.round(summary.totalAvailableCapacity)}h\n\n`;

  output += `👥 BY PERSON\n`;
  summary.users.slice(0, 5).forEach((user) => {
    output += formatWorkloadForDisplay(user);
    output += "\n";
  });

  if (summary.users.length > 5) {
    output += `... and ${summary.users.length - 5} more\n\n`;
  }

  if (summary.recommendations.length > 0) {
    output += `💡 RECOMMENDATIONS\n`;
    summary.recommendations.forEach((rec) => {
      output += `• ${rec}\n`;
    });
  }

  return output;
}
