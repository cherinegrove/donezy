
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download, TrendingUp, Clock, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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
  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const billableHours = filteredTimeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + entry.duration, 0) / 60;
  const totalProjects = filteredProjects.length;
  const completedProjects = filteredProjects.filter(p => p.status === "done").length;
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done").length;

  // Project status distribution
  const projectStatusData = [
    { name: "To Do", value: filteredProjects.filter(p => p.status === "todo").length, color: "#8884d8" },
    { name: "In Progress", value: filteredProjects.filter(p => p.status === "in-progress").length, color: "#82ca9d" },
    { name: "Done", value: filteredProjects.filter(p => p.status === "done").length, color: "#ffc658" }
  ];

  // Task status distribution
  const taskStatusData = [
    { name: "Backlog", value: filteredTasks.filter(t => t.status === "backlog").length, color: "#8884d8" },
    { name: "To Do", value: filteredTasks.filter(t => t.status === "todo").length, color: "#82ca9d" },
    { name: "In Progress", value: filteredTasks.filter(t => t.status === "in-progress").length, color: "#ffc658" },
    { name: "Review", value: filteredTasks.filter(t => t.status === "review").length, color: "#ff7300" },
    { name: "Done", value: filteredTasks.filter(t => t.status === "done").length, color: "#00ff00" }
  ];

  // Time tracking by day
  const timeByDay = filteredTimeEntries.reduce((acc, entry) => {
    const date = new Date(entry.startTime).toLocaleDateString();
    const hours = entry.duration / 60;
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.hours += hours;
      if (entry.billable) existing.billableHours += hours;
    } else {
      acc.push({
        date,
        hours,
        billableHours: entry.billable ? hours : 0
      });
    }
    return acc;
  }, [] as { date: string; hours: number; billableHours: number }[]);

  // Team productivity
  const teamProductivity = teams.map(team => {
    const teamTimeEntries = filteredTimeEntries.filter(entry => 
      team.memberIds.includes(entry.userId)
    );
    const teamTasks = filteredTasks.filter(task => 
      task.assigneeId && team.memberIds.includes(task.assigneeId)
    );
    
    return {
      name: team.name,
      hours: teamTimeEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60,
      completedTasks: teamTasks.filter(task => task.status === "done").length,
      totalTasks: teamTasks.length,
      members: team.memberIds.length
    };
  });

  // Client revenue (simplified calculation)
  const clientRevenue = clients.map(client => {
    const clientTimeEntries = filteredTimeEntries.filter(entry => entry.clientId === client.id);
    const billableTime = clientTimeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + entry.duration, 0) / 60;
    const revenue = billableTime * (client.billableRate || 100); // Default rate if not set
    
    return {
      name: client.name,
      revenue,
      hours: billableTime
    };
  }).filter(item => item.revenue > 0);

  // Project progress
  const projectProgress = filteredProjects.map(project => {
    const projectTasks = allTasks.filter(task => task.projectId === project.id);
    const completedTasks = projectTasks.filter(task => task.status === "done").length;
    const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
    
    return {
      name: project.name,
      progress: Math.round(progress),
      totalTasks: projectTasks.length,
      completedTasks
    };
  });

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
      projectStatus: projectStatusData,
      taskStatus: taskStatusData,
      timeTracking: timeByDay,
      teamProductivity,
      clientRevenue,
      projectProgress
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `report-${new Date().toISOString().split('T')[0]}.json`;
    
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
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {filteredProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Time Tracking Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hours" stroke="#8884d8" name="Total Hours" />
                <Line type="monotone" dataKey="billableHours" stroke="#82ca9d" name="Billable Hours" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamProductivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" name="Hours" />
                <Bar dataKey="completedTasks" fill="#82ca9d" name="Completed Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                <Bar dataKey="progress" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
