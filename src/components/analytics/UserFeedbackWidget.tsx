import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface UserFeedbackWidgetProps {
  data: {
    projects: any[];
    tasks: any[];
    timeEntries: any[];
    users: any[];
    clients: any[];
  };
}

interface FeedbackAnalysis {
  strengths: Array<{
    category: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }>;
  improvements: Array<{
    category: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  recommendations: Array<{
    action: string;
    rationale: string;
    timeline: "immediate" | "short-term" | "long-term";
  }>;
  overallAssessment: string;
  generatedAt: string;
}

export const UserFeedbackWidget = ({ data }: UserFeedbackWidgetProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [feedback, setFeedback] = useState<FeedbackAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateFeedback = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsLoading(true);
    try {
      // Gather user's work data
      const user = data.users.find(u => u.auth_user_id === selectedUserId);
      const userTasks = data.tasks.filter(t => t.assigneeId === selectedUserId);
      const userTimeEntries = data.timeEntries.filter(t => t.userId === selectedUserId);
      const userProjects = data.projects.filter(p => 
        p.ownerId === selectedUserId || 
        p.collaboratorIds?.includes(selectedUserId)
      );

      const userData = {
        user: {
          name: user?.name,
          role: user?.role,
          email: user?.email,
        },
        tasksCompleted: userTasks.filter(t => t.status === 'done').length,
        tasksInProgress: userTasks.filter(t => t.status === 'in-progress').length,
        tasksPending: userTasks.filter(t => t.status === 'todo').length,
        totalTasks: userTasks.length,
        projectsInvolved: userProjects.length,
        totalHoursLogged: userTimeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60,
        timeEntriesCount: userTimeEntries.length,
        recentTasks: userTasks.slice(0, 10).map(t => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          estimatedHours: t.estimatedHours,
        })),
        recentTimeEntries: userTimeEntries.slice(0, 20).map(e => ({
          duration: e.duration,
          status: e.status,
          startTime: e.startTime,
        })),
      };

      const { data: result, error } = await supabase.functions.invoke('smart-analytics', {
        body: {
          analysisType: 'user_feedback',
          data: userData,
        },
      });

      if (error) throw error;

      if (result.error) {
        if (result.error.includes("Rate limits exceeded")) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (result.error.includes("Payment required")) {
          toast.error("AI usage limit reached. Please add credits to continue.");
        } else {
          toast.error(result.error);
        }
        return;
      }

      setFeedback(result.analysis);
      toast.success("Feedback generated successfully");
    } catch (error) {
      console.error("Error generating feedback:", error);
      toast.error("Failed to generate feedback");
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "medium": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      case "low": return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "medium": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
      case "low": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      default: return "";
    }
  };

  const getTimelineColor = (timeline: string) => {
    switch (timeline) {
      case "immediate": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "short-term": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
      case "long-term": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a team member" />
          </SelectTrigger>
          <SelectContent>
            {data.users.map((user) => (
              <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={generateFeedback} disabled={isLoading || !selectedUserId}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Feedback
            </>
          )}
        </Button>
      </div>

      {feedback && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall Assessment */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm leading-relaxed">{feedback.overallAssessment}</p>
          </Card>

          {/* Strengths */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-lg">Strengths</h3>
            </div>
            <div className="space-y-2">
              {feedback.strengths.map((strength, idx) => (
                <Card key={idx} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{strength.category}</span>
                        <Badge variant="outline" className={getImpactColor(strength.impact)}>
                          {strength.impact} impact
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{strength.title}</h4>
                      <p className="text-sm text-muted-foreground">{strength.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-lg">Areas for Improvement</h3>
            </div>
            <div className="space-y-2">
              {feedback.improvements.map((improvement, idx) => (
                <Card key={idx} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{improvement.category}</span>
                        <Badge variant="outline" className={getPriorityColor(improvement.priority)}>
                          {improvement.priority} priority
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{improvement.title}</h4>
                      <p className="text-sm text-muted-foreground">{improvement.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg">Actionable Recommendations</h3>
            </div>
            <div className="space-y-2">
              {feedback.recommendations.map((rec, idx) => (
                <Card key={idx} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getTimelineColor(rec.timeline)}>
                          {rec.timeline}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{rec.action}</h4>
                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Generated on {new Date(feedback.generatedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!feedback && !isLoading && (
        <div className="py-12 text-center text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a team member and generate AI-powered feedback</p>
        </div>
      )}
    </div>
  );
};