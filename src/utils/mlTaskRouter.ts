import { Task, User, TimeEntry } from "@/types";

export interface TaskRecommendation {
  taskId: string;
  taskTitle: string;
  recommendedUserId: string;
  recommendedUserName: string;
  confidence: number; // 0-100
  reasoning: string[];
  alternativeUsers: Array<{
    userId: string;
    userName: string;
    confidence: number;
  }>;
}

export interface SkillProfile {
  userId: string;
  userName: string;
  skills: Map<string, { score: number; taskCount: number }>;
  estimateAccuracy: number; // how accurate their estimates are
  completionRate: number; // % of tasks completed on time
  specializations: string[];
}

export interface PredictedCompletion {
  projectId: string;
  estimatedCompletionDate: string;
  confidence: number; // 0-100
  daysUntilCompletion: number;
  atRiskFactors: string[];
  burnRate: number; // tasks completed per week
  projectedVsActual: {
    projected: string;
    actual: string;
    variance: number; // days
  };
}

// Extract skills from task titles and descriptions
function extractSkills(task: Task): string[] {
  const skillKeywords = [
    "react",
    "vue",
    "angular",
    "backend",
    "api",
    "database",
    "devops",
    "design",
    "ui",
    "ux",
    "testing",
    "qa",
    "documentation",
    "security",
    "performance",
    "deployment",
  ];

  const text = `${task.title} ${task.description}`.toLowerCase();
  return skillKeywords.filter((skill) => text.includes(skill));
}

// Calculate skill profile for a user based on their completed tasks
export function calculateSkillProfile(
  userId: string,
  userName: string,
  userTasks: Task[],
  timeEntries: TimeEntry[]
): SkillProfile {
  const skills = new Map<string, { score: number; taskCount: number }>();
  let completedOnTime = 0;
  let totalCompleted = 0;

  userTasks.forEach((task) => {
    if (task.status === "done") {
      totalCompleted++;

      // Check if completed on time
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const lastUpdate = new Date(task.createdAt);
        if (lastUpdate <= dueDate) {
          completedOnTime++;
        }
      } else {
        completedOnTime++;
      }

      // Extract and score skills
      const taskSkills = extractSkills(task);
      taskSkills.forEach((skill) => {
        const current = skills.get(skill) || { score: 0, taskCount: 0 };
        skills.set(skill, {
          score: current.score + 20, // Points per completed task
          taskCount: current.taskCount + 1,
        });
      });
    }
  });

  // Normalize skill scores to 0-100
  const normalizedSkills = new Map(
    Array.from(skills.entries()).map(([skill, data]) => [
      skill,
      {
        score: Math.min(100, data.score),
        taskCount: data.taskCount,
      },
    ])
  );

  const completionRate = totalCompleted > 0 ? (completedOnTime / totalCompleted) * 100 : 50;

  // Get top 3 specializations
  const specializations = Array.from(normalizedSkills.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([skill]) => skill);

  // Calculate estimate accuracy (how close their time entries are to task estimates)
  let estimateAccuracy = 80; // Default to 80%
  if (userTasks.length > 0) {
    const estimationErrors = userTasks
      .filter((t) => t.estimatedHours && t.timeEntries && t.timeEntries.length > 0)
      .map((t) => {
        const estimated = t.estimatedHours || 0;
        const actual = (t.timeEntries || []).reduce((sum, te) => sum + (te.duration || 0) / 60, 0);
        const error = Math.abs(estimated - actual) / estimated;
        return Math.max(0, 100 - error * 50); // Convert to accuracy %
      });

    if (estimationErrors.length > 0) {
      estimateAccuracy = estimationErrors.reduce((a, b) => a + b) / estimationErrors.length;
    }
  }

  return {
    userId,
    userName,
    skills: normalizedSkills,
    estimateAccuracy,
    completionRate,
    specializations,
  };
}

// Match a task to the best person
export function recommendTaskAssignment(
  task: Task,
  users: User[],
  skillProfiles: Map<string, SkillProfile>,
  userWorkloads: Map<string, number> // userId -> hours remaining
): TaskRecommendation {
  const taskSkills = extractSkills(task);

  const scores = users.map((user) => {
    let score = 50; // Base score

    const profile = skillProfiles.get(user.id);
    if (!profile) {
      return {
        userId: user.id,
        userName: user.name,
        score: 30, // Low score if no profile
      };
    }

    // Skill match: +20 points per matching skill
    taskSkills.forEach((skill) => {
      const skillScore = profile.skills.get(skill)?.score || 0;
      score += (skillScore / 100) * 20; // Up to 20 points per skill
    });

    // Capacity: +15 points if they have available time
    const availableHours = userWorkloads.get(user.id) || 0;
    if (availableHours > 10) {
      score += 15;
    } else if (availableHours > 5) {
      score += 8;
    }

    // Track record: +10 points for high completion rate
    score += (profile.completionRate / 100) * 10;

    // Estimate accuracy: +5 points for accurate estimates
    score += (profile.estimateAccuracy / 100) * 5;

    return {
      userId: user.id,
      userName: user.name,
      score: Math.min(100, score),
    };
  });

  // Sort by score
  const sorted = scores.sort((a, b) => b.score - a.score);
  const topThree = sorted.slice(0, 3);

  const recommended = topThree[0];
  const profile = skillProfiles.get(recommended.userId)!;

  // Generate reasoning
  const reasoning: string[] = [];
  if (taskSkills.length > 0) {
    const matchedSkills = taskSkills.filter((s) => profile.skills.has(s));
    if (matchedSkills.length > 0) {
      reasoning.push(`Expertise in ${matchedSkills.join(", ")}`);
    }
  }
  if (profile.completionRate > 90) {
    reasoning.push("Excellent track record (90%+ on-time)");
  }
  if (profile.specializations.includes(taskSkills[0])) {
    reasoning.push("This is a specialization area");
  }
  if ((userWorkloads.get(recommended.userId) || 0) > 10) {
    reasoning.push("Has available capacity");
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    recommendedUserId: recommended.userId,
    recommendedUserName: recommended.userName,
    confidence: recommended.score,
    reasoning,
    alternativeUsers: topThree.slice(1).map((u) => ({
      userId: u.userId,
      userName: u.userName,
      confidence: u.score,
    })),
  };
}

// Get all recommendations for unassigned tasks
export function recommendTaskAssignments(
  tasks: Task[],
  users: User[],
  skillProfiles: Map<string, SkillProfile>,
  userWorkloads: Map<string, number>
): TaskRecommendation[] {
  const unassignedTasks = tasks.filter((t) => !t.assigneeId && t.status !== "done");

  return unassignedTasks
    .map((task) => recommendTaskAssignment(task, users, skillProfiles, userWorkloads))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10); // Top 10 recommendations
}

// Find skills that need coverage (high demand, few people)
export function identifySkillGaps(
  tasks: Task[],
  skillProfiles: Map<string, SkillProfile>
): Array<{
  skill: string;
  demand: number; // # of tasks needing this skill
  coverage: number; // # of people with this skill
  risk: "critical" | "high" | "medium" | "low";
}> {
  const skillDemand = new Map<string, number>();

  tasks.forEach((task) => {
    if (task.status !== "done") {
      extractSkills(task).forEach((skill) => {
        skillDemand.set(skill, (skillDemand.get(skill) || 0) + 1);
      });
    }
  });

  const skillCoverage = Array.from(skillDemand.entries()).map(([skill, demand]) => {
    const coverage = Array.from(skillProfiles.values()).filter((p) => p.skills.has(skill)).length;

    const risk =
      coverage === 1
        ? "critical"
        : coverage === 2
          ? "high"
          : demand > coverage * 2
            ? "medium"
            : "low";

    return {
      skill,
      demand,
      coverage,
      risk,
    };
  });

  return skillCoverage.sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[a.risk] - riskOrder[b.risk];
  });
}

export function formatRecommendationsForDisplay(recommendations: TaskRecommendation[]): string {
  let output = `TASK ASSIGNMENT RECOMMENDATIONS\n`;
  output += `═════════════════════════════════════════════\n\n`;

  recommendations.forEach((rec) => {
    output += `📌 ${rec.taskTitle}\n`;
    output += `   👤 Recommend: ${rec.recommendedUserName} (${rec.confidence}% confidence)\n`;

    if (rec.reasoning.length > 0) {
      output += `   💡 ${rec.reasoning.join(" • ")}\n`;
    }

    if (rec.alternativeUsers.length > 0) {
      output += `   Or: ${rec.alternativeUsers.map((u) => `${u.userName} (${u.confidence}%)`).join(", ")}\n`;
    }

    output += `\n`;
  });

  return output;
}
