import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  Target,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const { projects, tasks, users, timeEntries } = useAppContext();
  const [loading, setLoading] = useState<string | null>(null);
  const [projectHealth, setProjectHealth] = useState<any>(null);
  const [taskInsights, setTaskInsights] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);
  const [timeTracking, setTimeTracking] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const analyzeProjectHealth = async () => {
    setLoading("project_health");
    try {
      const projectData = projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        dueDate: p.dueDate,
        allocatedHours: p.allocatedHours,
        usedHours: p.usedHours,
        taskCount: tasks.filter(t => t.projectId === p.id).length,
        completedTasks: tasks.filter(t => t.projectId === p.id && t.status === 'done').length,
        overdueTasks: tasks.filter(t => t.projectId === p.id && t.dueDate && new Date(t.dueDate) < new Date()).length,
      }));

      const { data, error } = await supabase.functions.invoke('smart-analytics', {
        body: { analysisType: 'project_health', data: projectData }
      });

      if (error) throw error;
      setProjectHealth(data.analysis);
      toast.success("Project health analysis complete");
    } catch (error: any) {
      console.error("Analysis error:", error);
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('402')) {
        toast.error("Payment required. Please add funds to your workspace.");
      } else {
        toast.error("Analysis failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const analyzeTaskInsights = async () => {
    setLoading("task_insights");
    try {
      const taskData = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        collaboratorIds: t.collaboratorIds,
      }));

      const { data, error } = await supabase.functions.invoke('smart-analytics', {
        body: { analysisType: 'task_insights', data: taskData }
      });

      if (error) throw error;
      setTaskInsights(data.analysis);
      toast.success("Task insights analysis complete");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message?.includes('429') ? "Rate limit exceeded" : "Analysis failed");
    } finally {
      setLoading(null);
    }
  };

  const analyzeTeamPerformance = async () => {
    setLoading("team_performance");
    try {
      const teamData = users.map(u => ({
        id: u.id,
        name: u.name,
        assignedTasks: tasks.filter(t => t.assigneeId === u.id).length,
        completedTasks: tasks.filter(t => t.assigneeId === u.id && t.status === 'done').length,
        totalHours: timeEntries.filter(e => e.userId === u.id).reduce((sum, e) => sum + (e.duration || 0), 0),
      }));

      const { data, error } = await supabase.functions.invoke('smart-analytics', {
        body: { analysisType: 'team_performance', data: teamData }
      });

      if (error) throw error;
      setTeamPerformance(data.analysis);
      toast.success("Team performance analysis complete");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message?.includes('429') ? "Rate limit exceeded" : "Analysis failed");
    } finally {
      setLoading(null);
    }
  };

  const analyzeTimeTracking = async () => {
    setLoading("time_tracking");
    try {
      const timeData = timeEntries.map(e => ({
        duration: e.duration,
        taskId: e.taskId,
        projectId: e.projectId,
        userId: e.userId,
        startTime: e.startTime,
        endTime: e.endTime,
      }));

      const { data, error } = await supabase.functions.invoke('smart-analytics', {
        body: { analysisType: 'time_tracking', data: timeData }
      });

      if (error) throw error;
      setTimeTracking(data.analysis);
      toast.success("Time tracking analysis complete");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message?.includes('429') ? "Rate limit exceeded" : "Analysis failed");
    } finally {
      setLoading(null);
    }
  };

  const getSmartRecommendations = async () => {
    setLoading("smart_recommendations");
    try {
      const allData = {
        projects: projects.length,
        tasks: tasks.length,
        users: users.length,
        overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
        completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0,
      };

      const { data, error } = await supabase.functions.invoke('smart-analytics', {
        body: { analysisType: 'smart_recommendations', data: allData }
      });

      if (error) throw error;
      setRecommendations(data.analysis);
      toast.success("Smart recommendations generated");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message?.includes('429') ? "Rate limit exceeded" : "Analysis failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Smart Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights for your projects, tasks, and team
          </p>
        </div>
      </div>

        <Tabs defaultValue="project" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="project">
              <TrendingUp className="h-4 w-4 mr-2" />
              Project Health
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Target className="h-4 w-4 mr-2" />
              Task Insights
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              Team Performance
            </TabsTrigger>
            <TabsTrigger value="time">
              <Clock className="h-4 w-4 mr-2" />
              Time Tracking
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Sparkles className="h-4 w-4 mr-2" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Health Analysis</CardTitle>
                <CardDescription>
                  AI analysis of project status, completion rates, and risk factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={analyzeProjectHealth} 
                  disabled={loading === "project_health"}
                  className="w-full"
                >
                  {loading === "project_health" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Project Health
                    </>
                  )}
                </Button>

                {projectHealth && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Status</span>
                      <Badge variant={
                        projectHealth.status === 'healthy' ? 'default' : 
                        projectHealth.status === 'at-risk' ? 'secondary' : 
                        'destructive'
                      }>
                        {projectHealth.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Completion Probability</span>
                        <span className="font-semibold">{projectHealth.completionProbability}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${projectHealth.completionProbability}%` }}
                        />
                      </div>
                    </div>

                    {projectHealth.risks && projectHealth.risks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Identified Risks
                        </h4>
                        <ul className="space-y-1">
                          {projectHealth.risks.map((risk: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {projectHealth.recommendations && projectHealth.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {projectHealth.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{projectHealth.insights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Task Insights</CardTitle>
                <CardDescription>
                  Optimal assignments, completion estimates, and priority recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={analyzeTaskInsights} 
                  disabled={loading === "task_insights"}
                  className="w-full"
                >
                  {loading === "task_insights" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Tasks
                    </>
                  )}
                </Button>

                {taskInsights && (
                  <div className="space-y-4 mt-6">
                    {taskInsights.estimatedCompletionDays && (
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm font-semibold">
                          Estimated Completion: {taskInsights.estimatedCompletionDays} days
                        </p>
                      </div>
                    )}

                    {taskInsights.priorityTasks && taskInsights.priorityTasks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Priority Tasks Requiring Attention</h4>
                        <ul className="space-y-1">
                          {taskInsights.priorityTasks.map((task: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {taskInsights.assignmentSuggestions && taskInsights.assignmentSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Assignment Suggestions</h4>
                        <ul className="space-y-1">
                          {taskInsights.assignmentSuggestions.map((suggestion: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{taskInsights.insights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Productivity patterns, top performers, and improvement areas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={analyzeTeamPerformance} 
                  disabled={loading === "team_performance"}
                  className="w-full"
                >
                  {loading === "team_performance" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Team
                    </>
                  )}
                </Button>

                {teamPerformance && (
                  <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Productivity Trend</p>
                        <p className="text-lg font-semibold capitalize">{teamPerformance.productivityTrend}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Workload Balance</p>
                        <p className="text-lg font-semibold capitalize">{teamPerformance.workloadBalance}</p>
                      </div>
                    </div>

                    {teamPerformance.topPerformers && teamPerformance.topPerformers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Top Performers
                        </h4>
                        <ul className="space-y-1">
                          {teamPerformance.topPerformers.map((performer: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {performer}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {teamPerformance.improvements && teamPerformance.improvements.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Areas for Improvement</h4>
                        <ul className="space-y-1">
                          {teamPerformance.improvements.map((improvement: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{teamPerformance.insights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Tracking Intelligence</CardTitle>
                <CardDescription>
                  Time efficiency, estimation accuracy, and optimization suggestions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={analyzeTimeTracking} 
                  disabled={loading === "time_tracking"}
                  className="w-full"
                >
                  {loading === "time_tracking" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Time Tracking
                    </>
                  )}
                </Button>

                {timeTracking && (
                  <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Efficiency Score</p>
                        <p className="text-2xl font-bold">{timeTracking.efficiencyScore}%</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Estimation Accuracy</p>
                        <p className="text-2xl font-bold">{timeTracking.estimationAccuracy}%</p>
                      </div>
                    </div>

                    {timeTracking.timeWasters && timeTracking.timeWasters.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Identified Time Wasters
                        </h4>
                        <ul className="space-y-1">
                          {timeTracking.timeWasters.map((waster: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {waster}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {timeTracking.suggestions && timeTracking.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Optimization Suggestions</h4>
                        <ul className="space-y-1">
                          {timeTracking.suggestions.map((suggestion: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{timeTracking.insights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Smart Recommendations</CardTitle>
                <CardDescription>
                  AI-powered actionable recommendations for your projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={getSmartRecommendations} 
                  disabled={loading === "smart_recommendations"}
                  className="w-full"
                >
                  {loading === "smart_recommendations" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Recommendations
                    </>
                  )}
                </Button>

                {recommendations && (
                  <div className="space-y-4 mt-6">
                    {recommendations.priorityActions && recommendations.priorityActions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Priority Actions
                        </h4>
                        <ul className="space-y-1">
                          {recommendations.priorityActions.map((action: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations.alerts && recommendations.alerts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Important Alerts
                        </h4>
                        <ul className="space-y-1">
                          {recommendations.alerts.map((alert: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {alert}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendations.processImprovements && recommendations.processImprovements.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Process Improvements</h4>
                        <ul className="space-y-1">
                          {recommendations.processImprovements.map((improvement: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground pl-6">
                              • {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{recommendations.insights}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
