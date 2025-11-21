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
  Loader2,
  BarChart3,
  FileText,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PrebuiltReportTemplates } from "@/components/reports/PrebuiltReportTemplates";
import { AnalyticsCard } from "@/components/reports/AnalyticsCard";
import { Progress } from "@/components/ui/progress";

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

  const handleTemplateSelect = (templateId: string) => {
    toast.info(`Report template "${templateId}" selected. Implementation in progress.`);
  };

  const quickStats = [
    { 
      title: "Active Projects", 
      value: projects.length, 
      icon: Target,
      trend: { value: 12, isPositive: true },
      color: "hsl(var(--primary))"
    },
    { 
      title: "Pending Tasks", 
      value: tasks.filter(t => t.status !== 'done').length,
      icon: CheckCircle,
      trend: { value: 8, isPositive: false },
      color: "hsl(217 91% 60%)"
    },
    { 
      title: "Team Members", 
      value: users.length,
      icon: Users,
      color: "hsl(280 50% 55%)"
    },
    { 
      title: "Hours Logged", 
      value: timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0).toFixed(1),
      icon: Clock,
      trend: { value: 15, isPositive: true },
      color: "hsl(142 71% 45%)"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              <Brain className="h-10 w-10 text-primary" />
              Smart Analytics
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              AI-powered insights and pre-built reports for comprehensive project analysis
            </p>
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <AnalyticsCard
              key={index}
              title={stat.title}
              icon={stat.icon}
              value={stat.value}
              trend={stat.trend}
              iconColor={stat.color}
            />
          ))}
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Pre-built Reports
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Zap className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Custom Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6 mt-6">
            <PrebuiltReportTemplates onSelectTemplate={handleTemplateSelect} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6 mt-6">
            <Tabs defaultValue="project" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-background/50">
                <TabsTrigger value="project" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Project Health
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <Target className="h-4 w-4" />
                  Task Insights
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2">
                  <Users className="h-4 w-4" />
                  Team Performance
                </TabsTrigger>
                <TabsTrigger value="time" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Time Tracking
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Recommendations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="project" className="space-y-4 mt-6">
                <Card className="border-primary/20 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Project Health Analysis
                    </CardTitle>
                    <CardDescription>
                      AI-powered analysis of project status, completion rates, and risk factors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <Button 
                      onClick={analyzeProjectHealth} 
                      disabled={loading === "project_health"}
                      className="w-full h-12 text-base font-medium"
                      size="lg"
                    >
                      {loading === "project_health" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing Projects...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-5 w-5" />
                          Run Project Health Analysis
                        </>
                      )}
                    </Button>

                    {projectHealth && (
                      <div className="space-y-6 mt-6 p-6 bg-gradient-to-br from-muted/30 to-transparent rounded-lg border border-border">
                        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                          <span className="text-sm font-medium">Overall Health Status</span>
                          <Badge 
                            variant={
                              projectHealth.status === 'healthy' ? 'default' : 
                              projectHealth.status === 'at-risk' ? 'secondary' : 
                              'destructive'
                            }
                            className="text-base px-4 py-1"
                          >
                            {projectHealth.status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Completion Probability</span>
                            <span className="font-bold text-lg text-primary">{projectHealth.completionProbability}%</span>
                          </div>
                          <Progress value={projectHealth.completionProbability} className="h-3" />
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

          <TabsContent value="tasks" className="space-y-4 mt-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Task Insights
                </CardTitle>
                <CardDescription>
                  Optimal assignments, completion estimates, and priority recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button 
                  onClick={analyzeTaskInsights} 
                  disabled={loading === "task_insights"}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {loading === "task_insights" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing Tasks...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Run Task Analysis
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

          <TabsContent value="team" className="space-y-4 mt-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Performance
                </CardTitle>
                <CardDescription>
                  Productivity patterns, top performers, and improvement areas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button 
                  onClick={analyzeTeamPerformance} 
                  disabled={loading === "team_performance"}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {loading === "team_performance" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing Team...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Run Team Analysis
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

          <TabsContent value="time" className="space-y-4 mt-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Time Tracking Intelligence
                </CardTitle>
                <CardDescription>
                  Time efficiency, estimation accuracy, and optimization suggestions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button 
                  onClick={analyzeTimeTracking} 
                  disabled={loading === "time_tracking"}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {loading === "time_tracking" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing Time Data...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Run Time Analysis
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

          <TabsContent value="recommendations" className="space-y-4 mt-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Smart Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered actionable recommendations for your projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button 
                  onClick={getSmartRecommendations} 
                  disabled={loading === "smart_recommendations"}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  {loading === "smart_recommendations" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Recommendations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Get Smart Recommendations
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
      </TabsContent>

      <TabsContent value="custom" className="space-y-6 mt-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Custom report builder coming soon</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
      </div>
    </div>
  );
}
