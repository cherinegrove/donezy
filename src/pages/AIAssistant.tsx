import { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateProjectRoundup, type ProjectRoundupData as ProjectRoundup } from "@/utils/projectRoundupGenerator";
import { getProjectDecisions, formatDecisionForDisplay, type Decision } from "@/utils/decisionLogger";
import { calculateTeamWorkload, type TeamWorkloadSummary } from "@/utils/workloadCalculator";
import { detectProjectBottlenecks, type ProjectBottlenecks } from "@/utils/bottleneckDetector";
import { analyzeProjectRisks, type RiskScore } from "@/utils/riskAlertSystem";
import { recommendTaskAssignments, calculateSkillProfile, type TaskRecommendation } from "@/utils/mlTaskRouter";
import { analyzeProjectMetrics, type ProjectMetrics } from "@/utils/predictiveAnalytics";
import DecisionDialog from "@/components/ai-assistant/DecisionDialog";
import DecisionsPanel from "@/components/ai-assistant/DecisionsPanel";
import WorkloadPanel from "@/components/ai-assistant/WorkloadPanel";
import BottleneckPanel from "@/components/ai-assistant/BottleneckPanel";
import RiskPanel from "@/components/ai-assistant/RiskPanel";
import RecommendationsPanel from "@/components/ai-assistant/RecommendationsPanel";
import PredictionsPanel from "@/components/ai-assistant/PredictionsPanel";
import QuickActionsBar from "@/components/ai-assistant/QuickActionsBar";
import ProjectSelector from "@/components/ai-assistant/ProjectSelector";
import TaskStatusFilter from "@/components/ai-assistant/TaskStatusFilter";
import { RoundupStatsBar } from "@/components/ai-assistant/RoundupStatsBar";
import {
  Send,
  Upload,
  Loader2,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ExtractedTask {
  title: string;
  description: string;
}

interface AssistantResponse {
  message: string;
  tasks?: ExtractedTask[];
  projectName?: string;
  projectDescription?: string;
  roundup?: ProjectRoundup;
}

export default function AIAssistant() {
  const { addProject, addTask, projects, tasks, users, currentUser, timeEntries } = useAppContext();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your AI Assistant. I can help you create tasks, analyze documents, answer questions about your projects, and suggest task breakdowns. How can I help?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewTasks, setPreviewTasks] = useState<ExtractedTask[]>([]);
  const [previewProject, setPreviewProject] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [roundup, setRoundup] = useState<ProjectRoundup | null>(null);
  const [roundupLoading, setRoundupLoading] = useState(false);
  const [roundupProjectId, setRoundupProjectId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [selectedProjectForDecision, setSelectedProjectForDecision] = useState<string | null>(null);
  const [showDecisionsPanel, setShowDecisionsPanel] = useState(false);
  const [workload, setWorkload] = useState<TeamWorkloadSummary | null>(null);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [bottlenecks, setBottlenecks] = useState<ProjectBottlenecks | null>(null);
  const [bottlenecksLoading, setBottlenecksLoading] = useState(false);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<TaskRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [predictions, setPredictions] = useState<ProjectMetrics | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"roundup" | "bottleneck" | "workload" | "risk" | "prediction" | "decision" | "import" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `📎 Uploaded: ${uploadedFile.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Convert file to base64 and send to backend for processing
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await sendToAssistant(
          `[File attached: ${uploadedFile.name}]`,
          uploadedFile.name,
          base64,
          uploadedFile.type
        );
        setLoading(false);
        setFile(null);
      };
      reader.onerror = () => {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Failed to read the file. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        setFile(null);
      };
      reader.readAsDataURL(uploadedFile);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Failed to process the file. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLoading(false);
      setFile(null);
    }
  };

  const sendToAssistant = async (
    userText: string,
    fileName?: string,
    fileBase64?: string,
    fileType?: string
  ) => {
    if (!userText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Prepare context about user's projects and tasks
      const projectContext = projects
        .map((p) => `- ${p.name} (${p.status})`)
        .join("\n");
      const taskContext = tasks.slice(0, 10).map((t) => `- ${t.title}`).join("\n");

      const response = await supabase.functions.invoke("ai-assistant", {
        body: {
          userMessage: userText,
          fileName,
          fileBase64,
          fileType,
          projects: projectContext,
          recentTasks: taskContext,
        },
      });

      if (!response.data) throw new Error("No response from assistant");

      const assistantData = response.data as AssistantResponse;

      // Add assistant response message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantData.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // If tasks were suggested, show preview
      if (assistantData.tasks && assistantData.tasks.length > 0) {
        setPreviewTasks(assistantData.tasks);
        setPreviewProject({
          name:
            assistantData.projectName || `Project - ${new Date().toLocaleDateString()}`,
          description: assistantData.projectDescription || "",
        });
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please try again or rephrase your request.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const message = input;
    setInput("");

    // Check if user is asking for a project roundup
    const roundupKeywords = [
      "roundup",
      "summarize",
      "summary",
      "status update",
      "project status",
      "breakdown",
    ];
    const isRoundupRequest = roundupKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isRoundupRequest) {
      const projectId = extractProjectIdFromMessage(message);
      if (projectId) {
        await generateProjectRoundupHandler(projectId, message);
        return;
      }
    }

    // Check if user is asking about decisions/past decisions
    const decisionKeywords = [
      "decision",
      "decided",
      "why did we",
      "why did you",
      "past decision",
      "remember when",
      "we chose",
      "we picked",
    ];
    const isDecisionQuery = decisionKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isDecisionQuery) {
      const projectId = extractProjectIdFromMessage(message);
      if (projectId) {
        await retrieveDecisions(projectId, message);
        return;
      }
    }

    // Check if user is asking about workload/capacity
    const workloadKeywords = [
      "workload",
      "capacity",
      "bandwidth",
      "overbooked",
      "available",
      "team capacity",
      "who has time",
      "is anyone available",
    ];
    const isWorkloadQuery = workloadKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isWorkloadQuery) {
      await analyzeTeamWorkload(message);
      return;
    }

    // Check if user is asking about bottlenecks
    const bottleneckKeywords = [
      "bottleneck",
      "blocked",
      "blocking",
      "stuck",
      "waiting on",
      "dependency",
      "unblock",
      "critical path",
    ];
    const isBottleneckQuery = bottleneckKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isBottleneckQuery) {
      const projectId = extractProjectIdFromMessage(message);
      if (projectId) {
        await analyzeBottlenecks(projectId, message);
        return;
      }
    }

    // Check if user is asking about risks
    const riskKeywords = [
      "risk",
      "at risk",
      "deadline",
      "going to miss",
      "going to be late",
      "health",
      "health check",
      "project status",
    ];
    const isRiskQuery = riskKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isRiskQuery) {
      const projectId = extractProjectIdFromMessage(message);
      if (projectId) {
        await analyzeRisks(projectId, message);
        return;
      }
    }

    // Check if user is asking for smart task assignments
    const assignmentKeywords = [
      "assign",
      "who should",
      "who can",
      "recommend",
      "best person",
      "task assignment",
      "allocation",
    ];
    const isAssignmentQuery = assignmentKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isAssignmentQuery) {
      await generateTaskRecommendations(message);
      return;
    }

    // Check if user is asking for predictions
    const predictionKeywords = [
      "predict",
      "forecast",
      "when will",
      "completion date",
      "how long",
      "project forecast",
      "burndown",
      "velocity",
    ];
    const isPredictionQuery = predictionKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    if (isPredictionQuery) {
      const projectId = extractProjectIdFromMessage(message);
      if (projectId) {
        await predictProjectCompletion(projectId, message);
        return;
      }
    }

    // Check if this is a follow-up question about the current roundup
    if (roundup && roundupProjectId) {
      const roundupFollowUpKeywords = [
        "why",
        "what",
        "how",
        "blocked",
        "stuck",
        "waiting",
        "status",
        "delayed",
        "overdue",
        "progress",
        "task",
        "who",
        "which",
      ];
      const isRoundupFollowUp = roundupFollowUpKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );

      if (isRoundupFollowUp) {
        await handleRoundupFollowUp(message);
        return;
      }
    }

    await sendToAssistant(message);
  };

  const retrieveDecisions = async (projectId: string, userMessage: string) => {
    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const projectDecisions = await getProjectDecisions(projectId);

      if (projectDecisions.length === 0) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I don't have any decisions logged for this project yet. You can log a decision for next time!",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setSelectedProjectForDecision(projectId);
        setShowDecisionDialog(true);
        return;
      }

      setDecisions(projectDecisions);
      setShowDecisionsPanel(true);

      let response = `Found ${projectDecisions.length} decision${
        projectDecisions.length > 1 ? "s" : ""
      } for this project:\n\n`;
      response += projectDecisions
        .slice(0, 3)
        .map(
          (d) =>
            `📌 ${d.title} (${new Date(d.createdAt).toLocaleDateString()})\n${d.reasoning}`
        )
        .join("\n\n");

      if (projectDecisions.length > 3) {
        response += `\n\n... and ${projectDecisions.length - 3} more decision${
          projectDecisions.length - 3 > 1 ? "s" : ""
        }`;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't retrieve the decisions. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const analyzeTeamWorkload = async (userMessage: string) => {
    setWorkloadLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const teamWorkload = calculateTeamWorkload(users, tasks, timeEntries);
      setWorkload(teamWorkload);

      let response = `TEAM CAPACITY ANALYSIS\n`;
      response += `═══════════════════════════════════════════\n\n`;
      response += `Average Utilization: ${teamWorkload.averageUtilization}%\n`;
      response += `Overbooked: ${teamWorkload.overbookedCount} | At Capacity: ${teamWorkload.atCapacityCount} | Available: ${teamWorkload.underutilizedCount}\n`;
      response += `Total Available Capacity: ${Math.round(teamWorkload.totalAvailableCapacity)}h\n\n`;

      if (teamWorkload.recommendations.length > 0) {
        response += `💡 TOP RECOMMENDATIONS\n`;
        teamWorkload.recommendations.slice(0, 3).forEach((rec) => {
          response += `• ${rec}\n`;
        });
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't analyze team workload. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setWorkloadLoading(false);
    }
  };

  const analyzeBottlenecks = async (projectId: string, userMessage: string) => {
    setBottlenecksLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const project = projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const projectTasks = tasks.filter((t) => t.projectId === projectId);
      const projectBottlenecks = detectProjectBottlenecks(projectId, project.name, projectTasks, users);
      setBottlenecks(projectBottlenecks);

      let response = `BOTTLENECK ANALYSIS - ${project.name}\n`;
      response += `═══════════════════════════════════════════\n\n`;
      response += `🚨 CRITICAL: ${projectBottlenecks.criticalCount}\n`;
      response += `📊 AFFECTED TASKS: ${projectBottlenecks.affectedTasksCount}\n\n`;

      if (projectBottlenecks.bottlenecks.length === 0) {
        response += `✅ No major bottlenecks detected!`;
      } else {
        response += `TOP BOTTLENECKS:\n`;
        projectBottlenecks.bottlenecks.slice(0, 3).forEach((b) => {
          response += `\n• ${b.name}\n  ${b.description}\n  → ${b.resolution}\n`;
        });

        if (projectBottlenecks.recommendations.length > 0) {
          response += `\n\nPRIORITY ACTIONS:\n`;
          projectBottlenecks.recommendations.forEach((rec, i) => {
            response += `${i + 1}. ${rec}\n`;
          });
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't analyze bottlenecks. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setBottlenecksLoading(false);
    }
  };

  const analyzeRisks = async (projectId: string, userMessage: string) => {
    setRiskLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const project = projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const projectTasks = tasks.filter((t) => t.projectId === projectId);
      const risk = analyzeProjectRisks(project, projectTasks, users, timeEntries);
      setRiskScore(risk);

      let response = `PROJECT RISK ANALYSIS - ${project.name}\n`;
      response += `═══════════════════════════════════════════\n\n`;
      response += `OVERALL RISK: ${risk.overallRisk}/100\n`;
      response += `Status: ${risk.healthStatus.toUpperCase()}\n`;
      response += `Active Alerts: ${risk.alerts.length}\n\n`;

      if (risk.alerts.length > 0) {
        response += `TOP ALERTS:\n`;
        risk.alerts.slice(0, 3).forEach((alert) => {
          response += `\n• ${alert.title}\n  ${alert.description}\n  → ${alert.suggestedAction}\n`;
        });
      }

      if (risk.predictions.length > 0) {
        response += `\n\nPREDICTIONS:\n`;
        risk.predictions.forEach((pred) => {
          response += `• ${pred}\n`;
        });
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't analyze project risks. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setRiskLoading(false);
    }
  };

  const extractProjectIdFromMessage = (message: string): string | null => {
    // Look for project in user's message
    // First, check if they mention a specific project name
    const projectMatch = projects.find((p) =>
      message.toLowerCase().includes(p.name.toLowerCase())
    );
    if (projectMatch) return projectMatch.id;

    // If they say "current project" or "this project", use the first one
    if (
      message.toLowerCase().includes("current") ||
      message.toLowerCase().includes("this")
    ) {
      return projects[0]?.id || null;
    }

    return null;
  };

  const handleQuickActionClick = (action: "roundup" | "bottleneck" | "workload" | "risk" | "prediction" | "decision") => {
    setSelectedAction(action);
    setSelectedProjectId(null);
    setSelectedStatuses([]);
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);

    // For workload queries, don't wait for project selection
    if (selectedAction === "workload") {
      await analyzeTeamWorkload(`Analyze team workload`);
      setSelectedAction(null);
      setSelectedProjectId(null);
      return;
    }

    // For decision queries, show the decision dialog
    if (selectedAction === "decision") {
      setSelectedProjectForDecision(projectId);
      setShowDecisionDialog(true);
      setSelectedAction(null);
      setSelectedProjectId(null);
      return;
    }
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handleExecuteAnalysis = async () => {
    if (!selectedProjectId || !selectedAction) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    // Filter tasks by status if any are selected
    let projectTasks = tasks.filter((t) => t.projectId === selectedProjectId);
    if (selectedStatuses.length > 0) {
      projectTasks = projectTasks.filter((t) => selectedStatuses.includes(t.status));
    }

    switch (selectedAction) {
      case "roundup":
        const roundupData = generateProjectRoundup(project, projectTasks, users);
        setRoundup(roundupData);
        setRoundupProjectId(selectedProjectId);
        const roundupMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `I've generated a project roundup for "${project.name}". Here's the summary:\n\n${roundupData.clientSummary}\n\nFeel free to ask me follow-up questions like "Why is this task blocked?" or "What's the status on X?"`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, roundupMsg]);
        break;

      case "bottleneck":
        const bottleneckData = detectProjectBottlenecks(selectedProjectId, project.name, projectTasks, users);
        setBottlenecks(bottleneckData);
        const bottleneckMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Analyzed bottlenecks for "${project.name}": ${bottleneckData.criticalCount} critical, ${bottleneckData.affectedTasksCount} affected tasks`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, bottleneckMsg]);
        break;

      case "risk":
        const riskData = analyzeProjectRisks(project, projectTasks, users, timeEntries);
        setRiskScore(riskData);
        const riskMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Risk analysis for "${project.name}": Overall risk ${riskData.overallRisk}/100, Status: ${riskData.healthStatus.toUpperCase()}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, riskMsg]);
        break;

      case "prediction":
        const metricsData = analyzeProjectMetrics(projectTasks, timeEntries);
        setPredictions(metricsData);
        const predictionMsg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Forecast for "${project.name}": ${metricsData.completionPercentage.toFixed(0)}% complete, projected ${metricsData.healthStatus}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, predictionMsg]);
        break;
    }

    // Reset selection
    setSelectedAction(null);
    setSelectedProjectId(null);
    setSelectedStatuses([]);
  };

  const generateProjectRoundupHandler = async (projectId: string, userMessage: string) => {
    setRoundupLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Find the project and its tasks
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const projectTasks = tasks.filter((t) => t.projectId === projectId);
      if (projectTasks.length === 0) {
        throw new Error("No tasks found for this project");
      }

      // Generate roundup using the helper function
      const roundupData = generateProjectRoundup(project, projectTasks, users);
      setRoundup(roundupData);

      // Add assistant response with roundup info
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've generated a project roundup for "${project.name}". Here's the summary:\n\n${roundupData.clientSummary}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't generate the project roundup. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setRoundupLoading(false);
    }
  };

  const generateTaskRecommendations = async (userMessage: string) => {
    setRecommendationsLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const unassignedTasks = tasks.filter((t) => !t.assigneeId);
      if (unassignedTasks.length === 0) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "All tasks are already assigned!",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const recs = recommendTaskAssignments(unassignedTasks, users, tasks);
      setRecommendations(recs);

      let response = `TASK RECOMMENDATIONS\n`;
      response += `═══════════════════════════════════════════\n\n`;
      response += `Found ${recs.length} unassigned tasks.\n\n`;
      response += `TOP RECOMMENDATIONS:\n`;
      recs.slice(0, 3).forEach((rec) => {
        response += `\n• ${rec.taskTitle}\n  Recommend: ${rec.recommendedUser.name} (${rec.confidence}% confidence)\n  Reason: ${rec.reasoning}\n`;
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't generate task recommendations. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const predictProjectCompletion = async (projectId: string, userMessage: string) => {
    setPredictionsLoading(true);

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const project = projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const projectTasks = tasks.filter((t) => t.projectId === projectId);
      const metrics = analyzeProjectMetrics(projectTasks, timeEntries);
      setPredictions(metrics);

      let response = `PROJECT FORECAST - ${project.name}\n`;
      response += `═══════════════════════════════════════════\n\n`;
      response += `Progress: ${metrics.completionPercentage.toFixed(0)}%\n`;
      response += `Velocity: ${metrics.taskVelocity.toFixed(1)} tasks/week\n`;
      response += `Burn Rate: ${metrics.burnRate.toFixed(0)} hours/week\n`;
      response += `Health: ${metrics.healthStatus.toUpperCase()}\n`;
      response += `Confidence: ${metrics.confidence}%\n`;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't forecast project completion. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleRoundupFollowUp = async (userMessage: string) => {
    if (!roundup || !roundupProjectId) return;

    setLoading(true);
    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Analyze the question and search roundup data
      let response = "";
      const lowerMessage = userMessage.toLowerCase();

      // Check for blocked/waiting tasks
      if (lowerMessage.includes("block") || lowerMessage.includes("waiting") || lowerMessage.includes("stuck")) {
        const blockedTasks = roundup.tasks.filter(
          (t) => t.status === "blocked" || t.status === "awaiting-feedback"
        );
        if (blockedTasks.length > 0) {
          response = `📋 BLOCKED/WAITING TASKS:\n\n`;
          blockedTasks.forEach((task) => {
            response += `• ${task.title}\n`;
            if (task.lastComments.length > 0) {
              response += `  Last update: ${task.lastComments[0].author} - "${task.lastComments[0].content}"\n`;
            }
            response += `  Risk factors: ${task.riskFactors.join(", ") || "None"}\n\n`;
          });
        } else {
          response = "No blocked or waiting tasks found! 🎉";
        }
      }

      // Check for overdue/delayed tasks
      else if (
        lowerMessage.includes("overdue") ||
        lowerMessage.includes("delayed") ||
        lowerMessage.includes("late")
      ) {
        const overdueTasks = roundup.tasks.filter((t) =>
          t.riskFactors.some((r) => r.toLowerCase().includes("overdue"))
        );
        if (overdueTasks.length > 0) {
          response = `⚠️ OVERDUE TASKS:\n\n`;
          overdueTasks.forEach((task) => {
            response += `• ${task.title}\n`;
            response += `  Due: ${task.dueDate || "No due date"}\n`;
            response += `  Status: ${task.status}\n`;
            if (task.assignee) response += `  Assigned to: ${task.assignee}\n`;
            response += `\n`;
          });
        } else {
          response = "No overdue tasks! Everything is on schedule. ✅";
        }
      }

      // Check for at-risk tasks
      else if (lowerMessage.includes("risk") || lowerMessage.includes("health")) {
        const atRiskTasks = roundup.tasks.filter((t) => t.isAtRisk);
        if (atRiskTasks.length > 0) {
          response = `🚨 AT-RISK TASKS (${atRiskTasks.length}):\n\n`;
          atRiskTasks.slice(0, 5).forEach((task) => {
            response += `• ${task.title}\n`;
            response += `  Risks: ${task.riskFactors.join(", ")}\n`;
            response += `  Progress: ${task.progress}%\n\n`;
          });
        } else {
          response = "No at-risk tasks detected! Project health looks good. 🟢";
        }
      }

      // Check for in-progress tasks
      else if (
        lowerMessage.includes("progress") ||
        lowerMessage.includes("active") ||
        lowerMessage.includes("working")
      ) {
        const inProgress = roundup.tasks.filter((t) => t.status === "in-progress");
        if (inProgress.length > 0) {
          response = `⏳ CURRENTLY IN PROGRESS (${inProgress.length}):\n\n`;
          inProgress.forEach((task) => {
            response += `• ${task.title} - ${task.progress}% complete\n`;
            if (task.assignee) response += `  Assigned to: ${task.assignee}\n`;
            response += `\n`;
          });
        } else {
          response = "No tasks currently in progress.";
        }
      }

      // Check for specific task
      else if (lowerMessage.includes("task") || lowerMessage.includes("what")) {
        const matchingTasks = roundup.tasks.filter((t) =>
          lowerMessage.includes(t.title.toLowerCase())
        );
        if (matchingTasks.length > 0) {
          response = `📌 TASK DETAILS:\n\n`;
          matchingTasks.forEach((task) => {
            response += `${task.title}\n`;
            response += `Status: ${task.status}\n`;
            response += `Progress: ${task.progress}%\n`;
            if (task.assignee) response += `Assigned to: ${task.assignee}\n`;
            if (task.dueDate) response += `Due: ${task.dueDate}\n`;
            response += `Days since update: ${task.daysSinceUpdate}\n`;
            if (task.riskFactors.length > 0) {
              response += `Risk factors: ${task.riskFactors.join(", ")}\n`;
            }
            if (task.lastComments.length > 0) {
              response += `\nLatest comments:\n`;
              task.lastComments.slice(0, 2).forEach((comment) => {
                response += `  • ${comment.author} (${comment.timestamp}): "${comment.content}"\n`;
              });
            }
            response += `\n`;
          });
        } else {
          response = `I couldn't find a specific task matching your question. Here's a summary:\n\n${roundup.statistics.completedTasks} completed, ${roundup.statistics.inProgressTasks} in progress, ${roundup.statistics.blockedTasks} blocked.`;
        }
      }

      // Default response with summary
      else {
        response = `Here's the current project status:\n\n`;
        response += `Completion: ${roundup.statistics.completionPercentage}%\n`;
        response += `Completed: ${roundup.statistics.completedTasks}\n`;
        response += `In Progress: ${roundup.statistics.inProgressTasks}\n`;
        response += `Blocked: ${roundup.statistics.blockedTasks}\n`;
        response += `At Risk: ${roundup.statistics.atRiskTasks}\n`;
        if (roundup.estimatedCompletion) {
          response += `\nEstimated Completion: ${roundup.estimatedCompletion}`;
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I encountered an issue analyzing your question. Can you rephrase it?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleImportTasks = async (projectId: string, file: File) => {
    setLoading(true);

    try {
      const project = projects.find((p) => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];

        // Send file to AI for task extraction
        const response = await supabase.functions.invoke("ai-assistant", {
          body: {
            userMessage: `Please extract all tasks from this file and create them in project "${project.name}". Format: JSON array of {title, description}`,
            fileName: file.name,
            fileBase64: base64,
            fileType: file.type,
            projects: `- ${project.name}`,
            recentTasks: "",
          },
        });

        if (!response.data) throw new Error("No response from assistant");

        const assistantData = response.data as AssistantResponse;

        // If tasks were extracted, create them
        if (assistantData.tasks && assistantData.tasks.length > 0) {
          assistantData.tasks.forEach((task, index) => {
            const newTask = {
              id: `task-${Date.now()}-${index}`,
              title: task.title,
              description: task.description,
              projectId: projectId,
              status: "not-started" as const,
              priority: "medium" as const,
              dueDate: null,
              assigneeId: null,
              estimatedHours: 0,
              createdAt: new Date().toISOString(),
              comments: [],
            };
            addTask(newTask);
          });

          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `✅ Successfully imported ${assistantData.tasks.length} tasks into "${project.name}" from ${file.name}!`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          toast({
            title: "Success",
            description: `Created ${assistantData.tasks.length} tasks from file`,
          });
        } else {
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `No tasks found in ${file.name}. Make sure the file contains task information.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Reset
        setFile(null);
        setSelectedAction(null);
        setSelectedProjectId(null);
      };
      reader.onerror = () => {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Failed to read the file. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I couldn't import tasks from the file. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!previewProject || previewTasks.length === 0) return;

    setCreating(true);

    try {
      const newProject = {
        id: `proj-${Date.now()}`,
        name: previewProject.name,
        description: previewProject.description,
        status: "not-started" as const,
        startDate: new Date().toISOString(),
        dueDate: null,
        clientId: null,
        allocatedHours: 0,
        usedHours: 0,
        owner: null,
        createdAt: new Date().toISOString(),
      };

      addProject(newProject);

      previewTasks.forEach((task, index) => {
        const newTask = {
          id: `task-${Date.now()}-${index}`,
          title: task.title,
          description: task.description,
          projectId: newProject.id,
          status: "not-started" as const,
          priority: "medium" as const,
          dueDate: null,
          assigneeId: null,
          estimatedHours: 0,
          createdAt: new Date().toISOString(),
          comments: [],
        };
        addTask(newTask);
      });

      toast({
        title: "Success",
        description: `Created project "${previewProject.name}" with ${previewTasks.length} tasks`,
      });

      setPreviewTasks([]);
      setPreviewProject(null);

      const confirmMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `✅ Great! I've created the project "${previewProject.name}" with ${previewTasks.length} tasks. Is there anything else I can help you with?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h1 className="text-3xl font-bold">AI Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your intelligent assistant for task creation, analysis, and planning
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-6 p-6">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Quick Actions & Interactive Filters */}
          <div className="space-y-3">
            <QuickActionsBar
              onRoundupClick={() => handleQuickActionClick("roundup")}
              onBottleneckClick={() => handleQuickActionClick("bottleneck")}
              onWorkloadClick={() => handleQuickActionClick("workload")}
              onRiskClick={() => handleQuickActionClick("risk")}
              onPredictionClick={() => handleQuickActionClick("prediction")}
              onDecisionClick={() => handleQuickActionClick("decision")}
              onImportClick={() => {
                handleQuickActionClick("import");
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            />

            {selectedAction === "import" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFile(file);
                      const userMsg: Message = {
                        id: Date.now().toString(),
                        role: "user",
                        content: `📎 Uploaded: ${file.name}`,
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, userMsg]);
                    }
                  }}
                  className="hidden"
                />
                {file && (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                      <p className="font-medium">📁 {file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ready to import tasks</p>
                    </div>
                    <ProjectSelector
                      projects={projects}
                      selectedProject={selectedProjectId}
                      onProjectSelect={(projectId) => {
                        setSelectedProjectId(projectId);
                        handleImportTasks(projectId, file);
                      }}
                      onActionClick={() => {}}
                      action={null}
                    />
                  </>
                )}
              </>
            )}

            {selectedAction && selectedAction !== "workload" && selectedAction !== "decision" && selectedAction !== "import" && (
              <>
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProjectId}
                  onProjectSelect={handleProjectSelect}
                  onActionClick={handleExecuteAnalysis}
                  action={selectedAction}
                />

                {selectedProjectId && (
                  <TaskStatusFilter
                    tasks={tasks.filter((t) => t.projectId === selectedProjectId)}
                    selectedStatuses={selectedStatuses}
                    onStatusToggle={handleStatusToggle}
                    onClearAll={() => setSelectedStatuses([])}
                  />
                )}
              </>
            )}
          </div>

          {/* Messages */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-semibold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "user" ? "You" : "AI"}
                  </div>
                  <div
                    className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="text-xs font-semibold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                    AI
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Describe your project, ask questions, or paste content..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                rows={3}
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={loading}
                    asChild
                    className="cursor-pointer"
                  >
                    <span>
                      <Upload className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Describe your project, upload a document, or ask for help
              with task planning
            </p>
          </div>
        </div>

        {/* Dialogs */}
        {selectedProjectForDecision && (
          <DecisionDialog
            projectId={selectedProjectForDecision}
            projectName={projects.find((p) => p.id === selectedProjectForDecision)?.name || "Project"}
            isOpen={showDecisionDialog}
            onClose={() => {
              setShowDecisionDialog(false);
              setSelectedProjectForDecision(null);
            }}
            currentUserName={currentUser?.name}
          />
        )}

        {/* Preview Section */}
        {(previewTasks.length > 0 || roundup || showDecisionsPanel || workload || bottlenecks || riskScore) && (
          <Card className="w-96 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {bottlenecks ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Bottlenecks
                  </>
                ) : riskScore ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Project Risk
                  </>
                ) : roundup ? (
                  <>
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Project Roundup
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Preview Tasks
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {bottlenecks && (
                <BottleneckPanel
                  bottlenecks={bottlenecks}
                  onClose={() => setBottlenecks(null)}
                />
              )}
              {riskScore && (
                <RiskPanel
                  riskScore={riskScore}
                  onClose={() => setRiskScore(null)}
                />
              )}
              {workload && (
                <WorkloadPanel
                  workload={workload}
                  onClose={() => setWorkload(null)}
                />
              )}
              {showDecisionsPanel && decisions.length > 0 && (
                <DecisionsPanel
                  decisions={decisions}
                  onClose={() => setShowDecisionsPanel(false)}
                />
              )}
              {roundup && (
                <div className="space-y-3">
                  <RoundupStatsBar roundup={roundup} />

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-2">
                    <h3 className="font-semibold text-sm">
                      {Math.round(roundup.statistics.completionPercentage)}% Complete
                    </h3>
                    {roundup.estimatedCompletion && (
                      <div className="text-xs text-muted-foreground">
                        Est. Completion: <span className="font-medium">{roundup.estimatedCompletion}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <label className="text-xs font-medium">Tasks Summary</label>
                    {roundup.tasks
                      .filter((t) => t.isAtRisk || t.status !== "done")
                      .slice(0, 5)
                      .map((task, index) => (
                        <div key={index} className="p-2 bg-muted/50 rounded border text-xs space-y-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {task.status}
                            </span>
                            <span>{task.progress}%</span>
                          </div>
                          {task.riskFactors.length > 0 && (
                            <div className="text-red-600 dark:text-red-400">
                              ⚠️ {task.riskFactors.join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  <div className="space-y-2 pt-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const text = roundup.clientSummary;
                          navigator.clipboard.writeText(text);
                          toast({
                            title: "Copied",
                            description: "Roundup copied",
                          });
                        }}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Copy Text
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const emailText = roundup.emailSummary;
                          navigator.clipboard.writeText(emailText);
                          toast({
                            title: "Copied",
                            description: "Email format copied",
                          });
                        }}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Copy Email
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoundup(null)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  </div>
                </div>
              )}
              {previewProject && !roundup && (
                <div className="border-b pb-4 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Project Name
                    </label>
                    <p className="font-semibold">{previewProject.name}</p>
                  </div>
                  {previewProject.description && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Description
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {previewProject.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Tasks ({previewTasks.length})
                </label>
                {previewTasks.map((task, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border space-y-1"
                  >
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewTasks([]);
                    setPreviewProject(null);
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
