
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWithinInterval, parseISO } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const Reports = () => {
  const { clients, projects, tasks, timeEntries, users, teams } = useAppContext();
  const [reportType, setReportType] = useState("time");
  const [dateRange, setDateRange] = useState("month");
  const { toast } = useToast();
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name,
      })),
    },
    {
      id: "projects",
      name: "Project",
      options: projects.map(project => ({
        id: project.id,
        label: project.name,
      })),
    },
    {
      id: "teams",
      name: "Team",
      options: teams.map(team => ({
        id: team.id,
        label: team.name,
      })),
    },
    {
      id: "users",
      name: "Team Member",
      options: users.map(user => ({
        id: user.id,
        label: user.name,
      })),
    },
  ];
  
  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };
  
  // Filter clients based on selections
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (activeFilters.clients && activeFilters.clients.length > 0) {
        return activeFilters.clients.includes(client.id);
      }
      return true;
    });
  }, [clients, activeFilters.clients]);
  
  // Get month date range
  const monthDateRange = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return { start, end };
  }, [selectedMonth]);
  
  // Get days in the selected month
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: monthDateRange.start,
      end: monthDateRange.end
    });
  }, [monthDateRange]);
  
  // Helper function to check if a time entry is within the selected month
  const isTimeEntryInMonth = (entry: typeof timeEntries[0]) => {
    const entryDate = parseISO(entry.startTime);
    return isWithinInterval(entryDate, {
      start: monthDateRange.start,
      end: monthDateRange.end
    });
  };
  
  // Prepare data for client time charts
  const clientTimeData = useMemo(() => {
    // Filter time entries for selected month
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    
    // Group by day and client
    const data = daysInMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayData: Record<string, number> = { date: day.getDate() };
      
      filteredClients.forEach(client => {
        const clientEntries = monthEntries.filter(entry => {
          const task = tasks.find(t => t.id === entry.taskId);
          if (!task) return false;
          
          const project = projects.find(p => p.id === task.projectId);
          return project && project.clientId === client.id && 
            format(parseISO(entry.startTime), "yyyy-MM-dd") === dayStr;
        });
        
        // Calculate total duration in hours
        const totalMinutes = clientEntries.reduce((sum, entry) => sum + entry.duration, 0);
        dayData[client.id] = +(totalMinutes / 60).toFixed(1);
      });
      
      return dayData;
    });
    
    return data;
  }, [filteredClients, daysInMonth, timeEntries, tasks, projects, monthDateRange]);
  
  // Prepare data for project time charts - showing projects for a specific client
  const projectTimeData = useMemo(() => {
    if (!activeFilters.clients || activeFilters.clients.length !== 1) {
      return [];
    }
    
    const clientId = activeFilters.clients[0];
    const clientProjects = projects.filter(p => p.clientId === clientId);
    
    // Filter time entries for selected month
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    
    // Group by day and project
    const data = daysInMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayData: Record<string, number> = { date: day.getDate() };
      
      clientProjects.forEach(project => {
        const projectEntries = monthEntries.filter(entry => {
          const task = tasks.find(t => t.id === entry.taskId);
          return task && task.projectId === project.id && 
            format(parseISO(entry.startTime), "yyyy-MM-dd") === dayStr;
        });
        
        // Calculate total duration in hours
        const totalMinutes = projectEntries.reduce((sum, entry) => sum + entry.duration, 0);
        dayData[project.id] = +(totalMinutes / 60).toFixed(1);
      });
      
      return dayData;
    });
    
    return data;
  }, [activeFilters.clients, projects, daysInMonth, timeEntries, tasks, monthDateRange]);

  // Prepare data for team member time charts - showing team members' time for a specific client
  const memberTimeData = useMemo(() => {
    if (!activeFilters.clients || activeFilters.clients.length !== 1) {
      return [];
    }
    
    const clientId = activeFilters.clients[0];
    const clientUsers = new Set<string>();
    
    // Find all users who worked on this client's projects
    timeEntries.forEach(entry => {
      const task = tasks.find(t => t.id === entry.taskId);
      if (!task) return;
      
      const project = projects.find(p => p.id === task.projectId);
      if (project && project.clientId === clientId) {
        clientUsers.add(entry.userId);
      }
    });
    
    // Get filtered users
    const relevantUsers = users.filter(user => clientUsers.has(user.id));
    
    // Filter time entries for selected month
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    
    // Group by day and user
    const data = daysInMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayData: Record<string, number> = { date: day.getDate() };
      
      relevantUsers.forEach(user => {
        const userEntries = monthEntries.filter(entry => {
          const task = tasks.find(t => t.id === entry.taskId);
          if (!task) return false;
          
          const project = projects.find(p => p.id === task.projectId);
          return project && 
                project.clientId === clientId && 
                entry.userId === user.id && 
                format(parseISO(entry.startTime), "yyyy-MM-dd") === dayStr;
        });
        
        // Calculate total duration in hours
        const totalMinutes = userEntries.reduce((sum, entry) => sum + entry.duration, 0);
        dayData[user.id] = +(totalMinutes / 60).toFixed(1);
      });
      
      return dayData;
    });
    
    return data;
  }, [activeFilters.clients, users, daysInMonth, timeEntries, tasks, projects, monthDateRange]);

  // Colors for the chart
  const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
    "#a4de6c", "#d0ed57", "#83a6ed", "#8dd1e1", "#a4c2f4", "#c49c94", "#b5739d", "#e8c3b9"
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-full md:w-60">
            <Select onValueChange={setReportType} defaultValue={reportType}>
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time Reports</SelectItem>
                <SelectItem value="progress">Project Progress</SelectItem>
                <SelectItem value="financial">Financial Reports</SelectItem>
                <SelectItem value="team">Team Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMMM yyyy") : "Select month"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    setSelectedMonth(date);
                  }
                }}
                initialFocus
                showMonthYearPicker
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <FilterBar filters={filterOptions} onFilterChange={handleFilterChange} />
      </div>
      
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="reports">Report Gallery</TabsTrigger>
          <TabsTrigger value="time">Time Details</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="pt-4 space-y-6">
          {/* Time Spent Monthly (broken down daily) per Client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Time Spent Monthly per Client</CardTitle>
              <CardDescription>
                Daily breakdown for {format(selectedMonth, "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {clientTimeData.length > 0 && filteredClients.length > 0 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={clientTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" label={{ value: 'Day of Month', position: 'insideBottomRight', offset: -10 }} />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {filteredClients.map((client, index) => (
                        <Bar 
                          key={client.id}
                          dataKey={client.id}
                          name={client.name}
                          fill={COLORS[index % COLORS.length]}
                          stackId="stack"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No data available. Select a client to view details.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Per Client Per Project */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Time Spent per Project</CardTitle>
              <CardDescription>
                {activeFilters.clients?.length === 1 
                  ? `Projects for ${clients.find(c => c.id === activeFilters.clients?.[0])?.name}, ${format(selectedMonth, "MMMM yyyy")}`
                  : 'Select a single client to view project breakdown'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {projectTimeData.length > 0 && activeFilters.clients?.length === 1 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" label={{ value: 'Day of Month', position: 'insideBottomRight', offset: -10 }} />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {projects
                        .filter(p => p.clientId === activeFilters.clients?.[0])
                        .map((project, index) => (
                          <Bar 
                            key={project.id}
                            dataKey={project.id}
                            name={project.name}
                            fill={COLORS[index % COLORS.length]}
                            stackId="stack"
                          />
                        ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Select a single client to view project breakdown.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Per Client Per Team Member */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Time Spent per Team Member</CardTitle>
              <CardDescription>
                {activeFilters.clients?.length === 1 
                  ? `Team members for ${clients.find(c => c.id === activeFilters.clients?.[0])?.name}, ${format(selectedMonth, "MMMM yyyy")}`
                  : 'Select a single client to view team member breakdown'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {memberTimeData.length > 0 && activeFilters.clients?.length === 1 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={memberTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" label={{ value: 'Day of Month', position: 'insideBottomRight', offset: -10 }} />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {users
                        .filter(user => {
                          const clientId = activeFilters.clients?.[0];
                          const userEntries = timeEntries.filter(entry => {
                            if (entry.userId !== user.id) return false;
                            const task = tasks.find(t => t.id === entry.taskId);
                            if (!task) return false;
                            const project = projects.find(p => p.id === task.projectId);
                            return project && project.clientId === clientId;
                          });
                          return userEntries.length > 0;
                        })
                        .map((user, index) => (
                          <Bar 
                            key={user.id}
                            dataKey={user.id}
                            name={user.name}
                            fill={COLORS[index % COLORS.length]}
                            stackId="stack"
                          />
                        ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Select a single client to view team member breakdown.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="time" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking Details</CardTitle>
              <CardDescription>
                Detailed breakdown of time entries by project, client, and team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Select report parameters to view time tracking details
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Reports</CardTitle>
              <CardDescription>
                Generate invoices and view client billing summaries 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClients.map(client => {
                  const clientProjects = projects.filter(p => p.clientId === client.id);
                  const totalHours = clientProjects.reduce((sum, p) => sum + p.usedHours, 0);
                  const billableAmount = totalHours * (client.billableRate || 0);
                  
                  return (
                    <div key={client.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {clientProjects.length} projects, {totalHours.toFixed(1)} hours
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {client.currency} {billableAmount.toFixed(2)}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-1"
                          onClick={() => toast({
                            title: "Invoice Generated",
                            description: `Invoice for ${client.name} has been created`
                          })}
                        >
                          Generate Invoice
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {filteredClients.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">
                    No clients available for billing reports
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Reports</CardTitle>
              <CardDescription>
                Create custom reports with the exact data you need
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="py-8 max-w-md mx-auto">
                <p className="text-muted-foreground mb-6">
                  Need a specific report? Create a custom report with the exact data you need.
                </p>
                <Button onClick={() => generateReport("custom")}>Create Custom Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
