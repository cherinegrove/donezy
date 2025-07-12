
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Clock, TrendingUp, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { ProjectsReports } from "@/components/reports/ProjectsReports";
import { TasksReports } from "@/components/reports/TasksReports";
import { TimeReports } from "@/components/reports/TimeReports";
import { BillingReports } from "@/components/reports/BillingReports";

type ReportTab = 'projects' | 'tasks' | 'time' | 'billing';

export default function Reports() {
  const { 
    projects, 
    tasks: allTasks, 
    timeEntries, 
    clients, 
    users, 
    teams,
    purchases 
  } = useAppContext();
  
  const [dateRange, setDateRange] = useState("30");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<ReportTab>("projects");

  // Filter data based on selected filters
  const filteredProjects = selectedClient === "all" 
    ? projects 
    : projects.filter(p => p.clientId === selectedClient);

  const filteredTasks = selectedProject === "all"
    ? allTasks
    : allTasks.filter(t => t.projectId === selectedProject);

  const filteredTimeEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime);
    const daysAgo = parseInt(dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    let matchesDateRange = entryDate >= cutoffDate;
    let matchesClient = selectedClient === "all" || entry.clientId === selectedClient;
    let matchesProject = selectedProject === "all" || entry.projectId === selectedProject;
    
    return matchesDateRange && matchesClient && matchesProject;
  });

  // Calculate metrics
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  const billableHours = filteredTimeEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  const totalProjects = filteredProjects.length;
  const completedProjects = filteredProjects.filter(p => p.status === "done").length;
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done").length;

  // Client revenue calculation
  const clientRevenue = clients.map(client => {
    const clientTimeEntries = filteredTimeEntries.filter(entry => entry.clientId === client.id);
    const billableTime = clientTimeEntries.filter(entry => entry.status === 'approved').reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
    const revenue = billableTime * 100; // Default rate of $100/hour
    
    return {
      name: client.name,
      revenue,
      hours: billableTime
    };
  }).filter(item => item.revenue > 0);

  const exportReport = () => {
    const reportData = {
      summary: {
        totalHours,
        billableHours,
        totalProjects,
        completedProjects,
        totalTasks,
        completedTasks
      },
      tab: activeTab,
      dateRange,
      selectedClient,
      selectedProject
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${activeTab}-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
        </Button>
      </div>

      {/* Global Filters */}
      <ReportsFilters
        dateRange={dateRange}
        selectedClient={selectedClient}
        selectedProject={selectedProject}
        onDateRangeChange={setDateRange}
        onClientChange={setSelectedClient}
        onProjectChange={setSelectedProject}
        clients={clients}
        projects={filteredProjects}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {billableHours.toFixed(1)} billable
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {completedProjects} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${clientRevenue.reduce((sum, client) => sum + client.revenue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From billable hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Reports */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <ProjectsReports projects={filteredProjects} tasks={filteredTasks} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <TasksReports tasks={filteredTasks} />
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <TimeReports timeEntries={filteredTimeEntries} users={users} teams={teams} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingReports timeEntries={filteredTimeEntries} clients={clients} purchases={purchases} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
