import { Task, User } from "@/types";

export interface TaskDependency {
  taskId: string;
  taskTitle: string;
  blocksCount: number;
  isBlocked: boolean;
  blockingTasks: string[];
  blockedByTasks: string[];
  riskScore: number;
}

export interface Bottleneck {
  type: "person" | "task" | "dependency";
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  affectedItems: string[];
  impact: number; // how many things are affected
  resolution: string; // how to fix it
  estimatedImpact: string; // time impact if not fixed
}

export interface ProjectBottlenecks {
  projectId: string;
  projectName: string;
  bottlenecks: Bottleneck[];
  criticalCount: number;
  affectedTasksCount: number;
  recommendations: string[];
  unblockingPriority: string[];
}

interface TaskGraph {
  [taskId: string]: {
    title: string;
    status: string;
    assignee?: string;
    dueDate?: string;
    dependencies: string[];
    dependents: string[];
  };
}

// Build task dependency graph
function buildDependencyGraph(tasks: Task[]): TaskGraph {
  const graph: TaskGraph = {};

  // Initialize all tasks
  tasks.forEach((task) => {
    graph[task.id] = {
      title: task.title,
      status: task.status,
      assignee: task.assigneeId,
      dueDate: task.dueDate,
      dependencies: task.relatedTaskIds || [],
      dependents: [],
    };
  });

  // Build backward links (dependents)
  tasks.forEach((task) => {
    (task.relatedTaskIds || []).forEach((depId) => {
      if (graph[depId]) {
        graph[depId].dependents.push(task.id);
      }
    });
  });

  return graph;
}

// Detect person bottlenecks (person is only one who can do something)
function detectPersonBottlenecks(
  tasks: Task[],
  users: User[]
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Group tasks by type/skill (using description/title keywords)
  const skillGroups = new Map<string, { userId: string; tasks: Task[] }>();

  // Identify critical skill areas
  const criticalSkills = ["API", "DevOps", "Database", "Architecture", "Security"];

  criticalSkills.forEach((skill) => {
    const skillTasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(skill.toLowerCase()) ||
        t.description.toLowerCase().includes(skill.toLowerCase())
    );

    if (skillTasks.length > 0) {
      const assignees = new Set(skillTasks.map((t) => t.assigneeId));

      if (assignees.size === 1) {
        const assigneeId = Array.from(assignees)[0];
        const assignee = userMap.get(assigneeId);

        if (assignee && skillTasks.some((t) => t.status !== "done")) {
          bottlenecks.push({
            type: "person",
            name: assignee.name,
            severity: "critical",
            description: `${assignee.name} is the only person working on ${skill} tasks`,
            affectedItems: skillTasks.map((t) => t.title),
            impact: skillTasks.length,
            resolution: `Pair ${assignee.name} with another developer for knowledge transfer`,
            estimatedImpact: `${skill} work blocked if ${assignee.name} unavailable`,
          });
        }
      }
    }
  });

  return bottlenecks;
}

// Detect task bottlenecks (many tasks blocked by one task)
function detectTaskBottlenecks(graph: TaskGraph): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  Object.entries(graph).forEach(([taskId, task]) => {
    if (task.status === "done") return;

    // Count how many tasks depend on this task
    const dependentCount = task.dependents.length;

    if (dependentCount >= 2) {
      const severity =
        dependentCount >= 5
          ? "critical"
          : dependentCount >= 3
            ? "high"
            : "medium";

      bottlenecks.push({
        type: "task",
        name: task.title,
        severity,
        description: `"${task.title}" is blocking ${dependentCount} other tasks`,
        affectedItems: task.dependents,
        impact: dependentCount,
        resolution: `Prioritize completing "${task.title}" immediately`,
        estimatedImpact: `${dependentCount} tasks can't start until this is done`,
      });
    }
  });

  return bottlenecks;
}

// Detect dependency chain bottlenecks
function detectDependencyBottlenecks(
  graph: TaskGraph,
  tasks: Task[]
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // Find critical paths (chains of dependencies)
  const findChainLength = (taskId: string, visited = new Set()): number => {
    if (visited.has(taskId)) return 0; // Avoid cycles
    visited.add(taskId);

    const deps = graph[taskId]?.dependencies || [];
    if (deps.length === 0) return 1;

    return 1 + Math.max(...deps.map((d) => findChainLength(d, new Set(visited))));
  };

  Object.entries(graph).forEach(([taskId, task]) => {
    if (task.status === "done") return;

    const chainLength = findChainLength(taskId);

    if (chainLength >= 4) {
      const severity =
        chainLength >= 6
          ? "critical"
          : chainLength >= 5
            ? "high"
            : "medium";

      bottlenecks.push({
        type: "dependency",
        name: `${task.title}`,
        severity,
        description: `Long dependency chain (${chainLength} tasks) with "${task.title}" in critical path`,
        affectedItems: [taskId],
        impact: chainLength,
        resolution: `Break down or parallelize tasks in this chain`,
        estimatedImpact: `Project delayed by ${chainLength * 3} days if chain blocks`,
      });
    }
  });

  return bottlenecks;
}

export function detectProjectBottlenecks(
  projectId: string,
  projectName: string,
  tasks: Task[],
  users: User[]
): ProjectBottlenecks {
  const graph = buildDependencyGraph(tasks);

  // Detect all bottlenecks
  const personBottlenecks = detectPersonBottlenecks(tasks, users);
  const taskBottlenecks = detectTaskBottlenecks(graph);
  const dependencyBottlenecks = detectDependencyBottlenecks(graph, tasks);

  const allBottlenecks = [
    ...personBottlenecks,
    ...taskBottlenecks,
    ...dependencyBottlenecks,
  ].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const criticalCount = allBottlenecks.filter((b) => b.severity === "critical")
    .length;

  const affectedTasksSet = new Set<string>();
  allBottlenecks.forEach((b) => {
    b.affectedItems.forEach((item) => affectedTasksSet.add(item));
  });

  // Generate recommendations (in priority order)
  const recommendations: string[] = [];

  allBottlenecks.slice(0, 3).forEach((b) => {
    recommendations.push(b.resolution);
  });

  // Generate unblocking priority list
  const unblockingPriority = taskBottlenecks
    .filter((b) => b.severity === "critical")
    .map((b) => b.name);

  return {
    projectId,
    projectName,
    bottlenecks: allBottlenecks,
    criticalCount,
    affectedTasksCount: affectedTasksSet.size,
    recommendations,
    unblockingPriority,
  };
}

export function formatBottlenecksForDisplay(bottlenecks: ProjectBottlenecks): string {
  let output = `PROJECT BOTTLENECKS - ${bottlenecks.projectName}\n`;
  output += `═══════════════════════════════════════════\n\n`;

  output += `🚨 CRITICAL: ${bottlenecks.criticalCount} bottlenecks\n`;
  output += `📊 AFFECTED: ${bottlenecks.affectedTasksCount} tasks impacted\n\n`;

  if (bottlenecks.bottlenecks.length === 0) {
    output += `✅ No major bottlenecks detected!\n`;
  } else {
    output += `BOTTLENECKS:\n`;
    bottlenecks.bottlenecks.forEach((b) => {
      const emoji =
        b.severity === "critical"
          ? "🚨"
          : b.severity === "high"
            ? "⚠️"
            : "⏳";
      output += `\n${emoji} [${b.severity.toUpperCase()}] ${b.name}\n`;
      output += `   ${b.description}\n`;
      output += `   💡 ${b.resolution}\n`;
    });
  }

  if (bottlenecks.recommendations.length > 0) {
    output += `\n\nPRIORITY ACTIONS:\n`;
    bottlenecks.recommendations.forEach((rec, i) => {
      output += `${i + 1}. ${rec}\n`;
    });
  }

  if (bottlenecks.unblockingPriority.length > 0) {
    output += `\n\nUNBLOCK THESE FIRST:\n`;
    bottlenecks.unblockingPriority.forEach((task) => {
      output += `→ ${task}\n`;
    });
  }

  return output;
}
