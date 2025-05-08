
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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine 
} from "recharts";
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, format, 
  isWithinInterval, parseISO, addMonths, subMonths 
} from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Download, ChartBarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";

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
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(prevMonth => subMonths(prevMonth, 1));
    setSelectedDate(prevDate => prevDate ? subMonths(prevDate, 1) : undefined);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, 1));
    setSelectedDate(prevDate => prevDate ? addMonths(prevDate, 1) : undefined);
  };
  
  // Generate custom report
  const handleGenerateReport = (type: string) => {
    toast({
      title: "Report Generated",
      description: `Your ${type} report has been generated successfully.`
    });
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
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    const totalHours = monthEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
    
    // Get unique days with time entries
    const uniqueDays = new Set(
      monthEntries.map(entry => format(parseISO(entry.startTime), "yyyy-MM-dd"))
    );
    
    // Calculate average daily hours
    const avgDailyHours = uniqueDays.size > 0 ? totalHours / uniqueDays.size : 0;
    
    // Calculate billable hours
    const billableHours = monthEntries
      .filter(entry => {
        const task = tasks.find(t => t.id === entry.taskId);
        return task?.billable;
      })
      .reduce((sum, entry) => sum + entry.duration, 0) / 60;
    
    return {
      totalHours: +totalHours.toFixed(1),
      billableHours: +billableHours.toFixed(1),
      billablePercentage: totalHours > 0 ? +(billableHours / totalHours * 100).toFixed(1) : 0,
      daysWorked: uniqueDays.size,
      avgDailyHours: +avgDailyHours.toFixed(1)
    };
  }, [timeEntries, tasks, monthDateRange]);
  
  // Prepare data for client time charts
  const clientTimeData = useMemo(() => {
    // Filter time entries for selected month
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    
    // Group by day and client
    const data = daysInMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayData: Record<string, number | string> = { 
        date: day.getDate(), 
        dateStr: format(day, "MMM d")
      };
      
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
      const dayData: Record<string, number | string> = { 
        date: day.getDate(),
        dateStr: format(day, "MMM d")
      };
      
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
      const dayData: Record<string, number | string> = { 
        date: day.getDate(),
        dateStr: format(day, "MMM d")
      };
      
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

  // Calculate client totals for the month
  const clientTotals = useMemo(() => {
    if (filteredClients.length === 0) return [];
    
    const monthEntries = timeEntries.filter(isTimeEntryInMonth);
    
    return filteredClients.map(client => {
      const clientEntries = monthEntries.filter(entry => {
        const task = tasks.find(t => t.id === entry.taskId);
        if (!task) return false;
        
        const project = projects.find(p => p.id === task.projectId);
        return project && project.clientId === client.id;
      });
      
      const totalMinutes = clientEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const totalHours = +(totalMinutes / 60).toFixed(1);
      
      return {
        clientId: client.id,
        clientName: client.name,
        hours: totalHours,
        billableAmount: client.billableRate ? +(totalHours * client.billableRate).toFixed(2) : 0,
        currency: client.currency || "USD"
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by most hours first
  }, [filteredClients, timeEntries, tasks, projects, monthDateRange]);

  // Colors for the chart - using improved color palette
  const COLORS = [
    "#9b87f5", "#0EA5E9", "#F97316", "#D946EF", "#8B5CF6", 
    "#0FA0CE", "#33C3F0", "#7E69AB", "#FEC6A1", "#6E59A5", 
    "#D6BCFA", "#1EAEDB", "#D3E4FD", "#FDE1D3"
  ];

  // Custom chart styles
  const chartStyle = {
    barSize: 20,
    fontSize: 12,
    yAxisWidth: 50,
    gridColor: "#E5DEFF",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#E5DEFF"
  };

  // Function to get relevant title for chart
  const getSelectedClientName = () => {
    if (activeFilters.clients?.length === 1) {
      const clientId = activeFilters.clients[0];
      const client = clients.find(c => c.id === clientId);
      return client?.name || 'Selected Client';
    }
    return undefined;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              Across {summaryStats.daysWorked} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.billableHours}h</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.billablePercentage}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgDailyHours}h</div>
            <p className="text-xs text-muted-foreground">
              Per active day
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientTotals.filter(c => c.hours > 0).length}</div>
            <p className="text-xs text-muted-foreground">
              With tracked time
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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
            
            <div className="flex items-center rounded-md border border-input bg-background">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                className="rounded-r-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-[180px] justify-center text-left font-normal rounded-none border-l border-r",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMMM yyyy") : "Select month"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="rounded-l-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              toast({
                title: "Reports Exported",
                description: "Reports have been exported to CSV"
              });
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Reports
          </Button>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Time Spent Monthly per Client
                  </CardTitle>
                  <CardDescription>
                    Daily breakdown for {format(selectedMonth, "MMMM yyyy")}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Total Hours</div>
                  <div className="text-2xl font-bold text-primary">
                    {summaryStats.totalHours}h
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {clientTimeData.length > 0 && filteredClients.length > 0 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={clientTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      barSize={chartStyle.barSize}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} />
                      <XAxis 
                        dataKey="dateStr" 
                        label={{ 
                          value: 'Day of Month', 
                          position: 'insideBottom', 
                          offset: -5,
                          fontSize: chartStyle.fontSize
                        }}
                        fontSize={chartStyle.fontSize} 
                        tickLine={false}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Hours', 
                          angle: -90, 
                          position: 'insideLeft',
                          fontSize: chartStyle.fontSize
                        }}
                        width={chartStyle.yAxisWidth}
                        fontSize={chartStyle.fontSize}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <ReferenceLine y={0} stroke="#000" />
                      <ChartTooltip 
                        cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} 
                        content={<ChartTooltipContent />} 
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        wrapperStyle={{ paddingBottom: '10px' }}
                        fontSize={chartStyle.fontSize}
                      />
                      {filteredClients.map((client, index) => (
                        <Bar 
                          key={client.id}
                          dataKey={client.id}
                          name={client.name}
                          fill={COLORS[index % COLORS.length]}
                          stackId="stack"
                          radius={[4, 4, 0, 0]}
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
          
          {/* Client Total Hours Summary */}
          {clientTotals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Hours Summary</CardTitle>
                <CardDescription>
                  Total hours per client for {format(selectedMonth, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Billable Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTotals.map(client => (
                      <TableRow key={client.clientId}>
                        <TableCell className="font-medium">{client.clientName}</TableCell>
                        <TableCell className="text-right">{client.hours}h</TableCell>
                        <TableCell className="text-right">
                          {client.billableAmount > 0 
                            ? `${client.currency} ${client.billableAmount.toLocaleString()}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          {/* Per Client Per Project */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Time Spent per Project
                  </CardTitle>
                  <CardDescription>
                    {activeFilters.clients?.length === 1 
                      ? `Projects for ${getSelectedClientName()}, ${format(selectedMonth, "MMMM yyyy")}`
                      : 'Select a single client to view project breakdown'}
                  </CardDescription>
                </div>
                {activeFilters.clients?.length === 1 && (
                  <div className="text-right">
                    <div className="text-sm font-medium">Projects</div>
                    <div className="text-xl font-bold text-primary">
                      {projects.filter(p => p.clientId === activeFilters.clients?.[0]).length}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {projectTimeData.length > 0 && activeFilters.clients?.length === 1 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      barSize={chartStyle.barSize}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} />
                      <XAxis 
                        dataKey="dateStr" 
                        label={{ 
                          value: 'Day of Month', 
                          position: 'insideBottom', 
                          offset: -5,
                          fontSize: chartStyle.fontSize
                        }}
                        fontSize={chartStyle.fontSize}
                        tickLine={false}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Hours', 
                          angle: -90, 
                          position: 'insideLeft',
                          fontSize: chartStyle.fontSize
                        }}
                        width={chartStyle.yAxisWidth}
                        fontSize={chartStyle.fontSize}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <ReferenceLine y={0} stroke="#000" />
                      <ChartTooltip 
                        cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} 
                        content={<ChartTooltipContent />} 
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        wrapperStyle={{ paddingBottom: '10px' }}
                        fontSize={chartStyle.fontSize}
                      />
                      {projects
                        .filter(p => p.clientId === activeFilters.clients?.[0])
                        .map((project, index) => (
                          <Bar 
                            key={project.id}
                            dataKey={project.id}
                            name={project.name}
                            fill={COLORS[index % COLORS.length]}
                            stackId="stack"
                            radius={[4, 4, 0, 0]}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Time Spent per Team Member
                  </CardTitle>
                  <CardDescription>
                    {activeFilters.clients?.length === 1 
                      ? `Team members for ${getSelectedClientName()}, ${format(selectedMonth, "MMMM yyyy")}`
                      : 'Select a single client to view team member breakdown'}
                  </CardDescription>
                </div>
                {activeFilters.clients?.length === 1 && (
                  <div className="text-right">
                    <div className="text-sm font-medium">Team Members</div>
                    <div className="text-xl font-bold text-primary">
                      {users.filter(user => {
                          const clientId = activeFilters.clients?.[0];
                          const userEntries = timeEntries.filter(entry => {
                            if (entry.userId !== user.id) return false;
                            const task = tasks.find(t => t.id === entry.taskId);
                            if (!task) return false;
                            const project = projects.find(p => p.id === task.projectId);
                            return project && project.clientId === clientId;
                          });
                          return userEntries.length > 0;
                        }).length}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {memberTimeData.length > 0 && activeFilters.clients?.length === 1 ? (
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={memberTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      barSize={chartStyle.barSize}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.gridColor} />
                      <XAxis 
                        dataKey="dateStr" 
                        label={{ 
                          value: 'Day of Month', 
                          position: 'insideBottom', 
                          offset: -5,
                          fontSize: chartStyle.fontSize
                        }}
                        fontSize={chartStyle.fontSize}
                        tickLine={false}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Hours', 
                          angle: -90, 
                          position: 'insideLeft',
                          fontSize: chartStyle.fontSize
                        }}
                        width={chartStyle.yAxisWidth}
                        fontSize={chartStyle.fontSize}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <ReferenceLine y={0} stroke="#000" />
                      <ChartTooltip 
                        cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} 
                        content={<ChartTooltipContent />} 
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right"
                        wrapperStyle={{ paddingBottom: '10px' }}
                        fontSize={chartStyle.fontSize}
                      />
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
                            radius={[4, 4, 0, 0]}
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
                <Button onClick={() => handleGenerateReport("custom")}>Create Custom Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

