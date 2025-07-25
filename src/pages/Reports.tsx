
import { useState, useEffect } from "react";
import { subDays, isAfter, isBefore, isEqual } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Clock, TrendingUp, Users, DollarSign, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { ProjectsReports } from "@/components/reports/ProjectsReports";
import { TasksReports } from "@/components/reports/TasksReports";
import { TimeReports } from "@/components/reports/TimeReports";
import { BillingReports } from "@/components/reports/BillingReports";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";
import { CustomReportVisualization } from "@/components/reports/CustomReportVisualization";

type ReportTab = 'projects' | 'tasks' | 'time' | 'billing' | 'custom';

export default function Reports() {
  const { 
    projects, 
    tasks: allTasks, 
    timeEntries, 
    clients, 
    users, 
    teams,
    purchases,
    savedReports,
    customDashboards,
    deleteSavedReport,
    updateSavedReport
  } = useAppContext();
  
  const { toast } = useToast();
  
  // Initialize with last 30 days
  const [startDate, setStartDate] = useState<Date | undefined>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
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
    
    // Date range filtering
    let matchesDateRange = true;
    if (startDate && endDate) {
      matchesDateRange = (isAfter(entryDate, startDate) || isEqual(entryDate, startDate)) && 
                        (isBefore(entryDate, endDate) || isEqual(entryDate, endDate));
    } else if (startDate) {
      matchesDateRange = isAfter(entryDate, startDate) || isEqual(entryDate, startDate);
    } else if (endDate) {
      matchesDateRange = isBefore(entryDate, endDate) || isEqual(entryDate, endDate);
    }
    
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

  // Get saved reports for each tab based on their data source
  const getTabReports = (tabType: ReportTab) => {
    const dataSourceMap: Record<ReportTab, string[]> = {
      'projects': ['projects'],
      'tasks': ['tasks'],
      'time': ['time_entries'],
      'billing': ['purchases'],
      'custom': [] // All reports appear in custom tab
    };
    
    const validDataSources = dataSourceMap[tabType];
    
    return savedReports.filter(report => 
      validDataSources.includes(report.reportConfig.dataSource)
    );
  };

  const handleDeleteReport = (reportId: string, reportName: string) => {
    deleteSavedReport(reportId);
    toast({
      title: "Report Deleted",
      description: `"${reportName}" has been removed successfully.`,
    });
  };

  const handleEditReport = (reportId: string) => {
    // TODO: Implement edit functionality - for now just show a message
    toast({
      title: "Edit Report",
      description: "Edit functionality coming soon. Use Custom Reports tab to create a new report.",
      variant: "default",
    });
  };

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
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <ProjectsReports 
            projects={filteredProjects} 
            tasks={filteredTasks} 
            clients={clients}
            teams={teams}
          />
          
          {/* Saved Reports Section */}
          {getTabReports('projects').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Saved Project Reports</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getTabReports('projects').map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditReport(report.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteReport(report.id, report.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CustomReportVisualization 
                        config={report.reportConfig} 
                        data={report.reportData} 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <TasksReports tasks={filteredTasks} />
          
          {/* Saved Reports Section */}
          {getTabReports('tasks').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Saved Task Reports</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getTabReports('tasks').map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditReport(report.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteReport(report.id, report.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CustomReportVisualization 
                        config={report.reportConfig} 
                        data={report.reportData} 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <TimeReports timeEntries={filteredTimeEntries} users={users} teams={teams} />
          
          {/* Saved Reports Section */}
          {getTabReports('time').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Saved Time Reports</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getTabReports('time').map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditReport(report.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteReport(report.id, report.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CustomReportVisualization 
                        config={report.reportConfig} 
                        data={report.reportData} 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingReports timeEntries={filteredTimeEntries} clients={clients} purchases={purchases} />
          
          {/* Saved Reports Section */}
          {getTabReports('billing').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Saved Billing Reports</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getTabReports('billing').map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditReport(report.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteReport(report.id, report.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CustomReportVisualization 
                        config={report.reportConfig} 
                        data={report.reportData} 
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
