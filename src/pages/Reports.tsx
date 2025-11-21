import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, Activity, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { PredictiveInsights } from "@/components/analytics/PredictiveInsights";
import { BottleneckDetection } from "@/components/analytics/BottleneckDetection";
import { PerformanceTrends } from "@/components/analytics/PerformanceTrends";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";

type AnalyticsTab = 'insights' | 'bottlenecks' | 'performance' | 'custom';

export default function Reports() {
  const { 
    projects, 
    tasks, 
    timeEntries, 
    clients, 
    users, 
    teams
  } = useAppContext();
  
  const { toast } = useToast();
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("insights");

  // Filter data based on selected filters
  const filteredProjects = selectedClient === "all" 
    ? projects 
    : projects.filter(p => p.clientId === selectedClient);

  const filteredTasks = selectedProject === "all"
    ? tasks
    : tasks.filter(t => t.projectId === selectedProject);

  const filteredTimeEntries = timeEntries.filter(entry => {
    let matchesClient = selectedClient === "all" || entry.clientId === selectedClient;
    let matchesProject = selectedProject === "all" || entry.projectId === selectedProject;
    return matchesClient && matchesProject;
  });

  const exportAnalytics = () => {
    const analyticsData = {
      timestamp: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        selectedClient,
        selectedProject
      },
      summary: {
        totalProjects: filteredProjects.length,
        totalTasks: filteredTasks.length,
        totalTimeEntries: filteredTimeEntries.length
      }
    };
    
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Analytics Exported",
      description: "Your analytics data has been downloaded.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Analytics</h1>
          <p className="text-muted-foreground mt-1">Data-driven insights and analytics</p>
        </div>
        <Button onClick={exportAnalytics} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Global Filters */}
      <ReportsFilters
        startDate={startDate}
        endDate={endDate}
        selectedClient={selectedClient}
        selectedProject={selectedProject}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClientChange={setSelectedClient}
        onProjectChange={setSelectedProject}
        clients={clients}
        projects={filteredProjects}
      />

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AnalyticsTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="gap-2">
            <Zap className="h-4 w-4" />
            Predictive Insights
          </TabsTrigger>
          <TabsTrigger value="bottlenecks" className="gap-2">
            <Target className="h-4 w-4" />
            Bottlenecks
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Activity className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <PredictiveInsights 
            projects={filteredProjects}
            tasks={filteredTasks}
            timeEntries={filteredTimeEntries}
          />
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-6">
          <BottleneckDetection
            tasks={filteredTasks}
            projects={filteredProjects}
            users={users}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceTrends
            tasks={filteredTasks}
            timeEntries={filteredTimeEntries}
            clients={clients}
            users={users}
          />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
