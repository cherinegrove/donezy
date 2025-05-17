import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { Play, Clock, Calendar, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { TimeEntry, TimeEntryStatus } from "@/types";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { EditTimeEntryDialog } from "@/components/time/EditTimeEntryDialog";
import { useToast } from "@/hooks/use-toast";

const TimeTracking = () => {
  const { timeEntries, users, tasks, projects, clients, startTimeTracking, activeTimeEntry, currentUser, updateTimeEntryStatus } = useAppContext();
  const [activeTab, setActiveTab] = useState("active");
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | undefined>(undefined);
  const [isEditEntryDialogOpen, setIsEditEntryDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  
  // Date range filter for timesheet
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Create filter options
  const filterOptions: FilterOption[] = [
    {
      id: "user",
      name: "User",
      options: users.map(user => ({
        id: user.id,
        label: user.name
      }))
    },
    {
      id: "client",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name
      }))
    },
    {
      id: "project",
      name: "Project",
      options: projects.map(project => ({
        id: project.id,
        label: project.name
      }))
    }
  ];
  
  // Filter time entries based on selected filters and date range
  const filteredTimeEntries = timeEntries.filter(entry => {
    const task = tasks.find(t => t.id === entry.taskId);
    if (!task) return false;
    
    const project = projects.find(p => p.id === task.projectId);
    if (!project) return false;
    
    // Check user filter
    if (selectedFilters.user?.length > 0 && !selectedFilters.user.includes(entry.userId)) {
      return false;
    }
    
    // Check project filter
    if (selectedFilters.project?.length > 0 && !selectedFilters.project.includes(task.projectId)) {
      return false;
    }
    
    // Check client filter
    if (selectedFilters.client?.length > 0 && project && !selectedFilters.client.includes(project.clientId)) {
      return false;
    }
    
    // Check date range
    if (dateRange.from || dateRange.to) {
      const entryDate = new Date(entry.startTime);
      
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
      } else if (dateRange.from) {
        return entryDate >= dateRange.from;
      } else if (dateRange.to) {
        return entryDate <= dateRange.to;
      }
    }
    
    return true;
  });
  
  // Get unique dates from filtered time entries
  const dates = [...new Set(filteredTimeEntries.map(entry => 
    format(new Date(entry.startTime), "yyyy-MM-dd")
  ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Group filtered time entries by date
  const entriesByDate = dates.reduce((acc, date) => {
    acc[date] = filteredTimeEntries.filter(entry => 
      format(new Date(entry.startTime), "yyyy-MM-dd") === date
    );
    return acc;
  }, {} as Record<string, typeof filteredTimeEntries>);
  
  // Get active timers (tasks that have active time entries)
  const getActiveTimers = () => {
    if (!activeTimeEntry) return [];
    
    const activeTasks = tasks.filter(task => task.id === activeTimeEntry.taskId);
    
    return activeTasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const client = project ? clients.find(c => c.id === project.clientId) : undefined;
      const user = users.find(u => u.id === activeTimeEntry.userId);
      
      return {
        task,
        project,
        client,
        user,
        timeEntry: activeTimeEntry
      };
    });
  };
  
  // Get recently active tasks (tasks with time entries in the last week)
  const getRecentlyActiveTasks = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentEntries = timeEntries
      .filter(entry => new Date(entry.startTime) > weekAgo)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
    const recentTaskIds = [...new Set(recentEntries.map(e => e.taskId))];
    
    return recentTaskIds.slice(0, 5).map(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return null;
      
      const project = projects.find(p => p.id === task.projectId);
      const client = project ? clients.find(c => c.id === project.clientId) : undefined;
      
      return { task, project, client };
    }).filter(Boolean);
  };
  
  // Get total duration for a given day
  const getTotalDuration = (entries: typeof timeEntries) => {
    return entries.reduce((total, entry) => total + entry.duration, 0);
  };
  
  // Active timers and recent tasks for the Active tab
  const activeTimers = getActiveTimers();
  const recentlyActiveTasks = getRecentlyActiveTasks();
    
  // Generate monthly report data grouped by client
  const getMonthlyDataByClient = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get entries for the selected month
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });
    
    // Group entries by client first
    const entriesByClient: Record<string, { 
      client: typeof clients[0],
      totalMinutes: number,
      projectDetails: Record<string, {
        project: typeof projects[0],
        totalMinutes: number,
        taskDetails: Record<string, {
          task: typeof tasks[0],
          totalMinutes: number,
          entries: typeof timeEntries
        }>
      }>
    }> = {};
    
    // Process all entries
    monthEntries.forEach(entry => {
      const task = tasks.find(t => t.id === entry.taskId);
      if (!task) return;
      
      const project = projects.find(p => p.id === task.projectId);
      if (!project) return;
      
      const client = clients.find(c => c.id === project.clientId);
      if (!client) return;
      
      // Initialize client entry if needed
      if (!entriesByClient[client.id]) {
        entriesByClient[client.id] = { 
          client, 
          totalMinutes: 0,
          projectDetails: {}
        };
      }
      
      // Add to client total
      entriesByClient[client.id].totalMinutes += entry.duration;
      
      // Initialize project entry if needed
      if (!entriesByClient[client.id].projectDetails[project.id]) {
        entriesByClient[client.id].projectDetails[project.id] = {
          project,
          totalMinutes: 0,
          taskDetails: {}
        };
      }
      
      // Add to project total
      entriesByClient[client.id].projectDetails[project.id].totalMinutes += entry.duration;
      
      // Initialize task entry if needed
      if (!entriesByClient[client.id].projectDetails[project.id].taskDetails[task.id]) {
        entriesByClient[client.id].projectDetails[project.id].taskDetails[task.id] = {
          task,
          totalMinutes: 0,
          entries: []
        };
      }
      
      // Add to task total and entries
      entriesByClient[client.id].projectDetails[project.id].taskDetails[task.id].totalMinutes += entry.duration;
      entriesByClient[client.id].projectDetails[project.id].taskDetails[task.id].entries.push(entry);
    });
    
    return Object.values(entriesByClient).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };
  
  const monthlyDataByClient = getMonthlyDataByClient();
  
  // Get available months for the selector
  const getAvailableMonths = () => {
    const months = new Set<string>();
    timeEntries.forEach(entry => {
      const date = new Date(entry.startTime);
      months.add(format(date, "yyyy-MM"));
    });
    return Array.from(months).sort().reverse();
  };
  
  const availableMonths = getAvailableMonths();
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Checks if current user can edit a time entry
  const canEditTimeEntry = (entry: TimeEntry) => {
    // Users can edit their own entries
    if (entry.userId === currentUser?.id) return true;
    
    // Admins and managers can edit any entry
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') return true;
    
    return false;
  };

  // Checks if current user can approve/decline a time entry
  const canApproveTimeEntry = () => {
    // Only admins and managers can approve/decline time entries
    return currentUser?.role === 'admin' || currentUser?.role === 'manager';
  };
  
  const handleEditTimeEntry = (entry: TimeEntry) => {
    setSelectedTimeEntry(entry);
    setIsEditEntryDialogOpen(true);
  };
  
  const handleAddNewEntry = () => {
    setSelectedTimeEntry(undefined);
    setIsAddEntryDialogOpen(true);
  };
  
  const handleApproveTimeEntry = (entry: TimeEntry, billable: boolean = true) => {
    if (!currentUser) return;
    
    const status = billable ? "approved-billable" : "approved-non-billable";
    updateTimeEntryStatus(entry.id, status, currentUser.id);
    
    toast({
      title: "Time Entry Approved",
      description: `The time entry has been marked as ${billable ? 'billable' : 'non-billable'}.`,
    });
  };
  
  const handleDeclineTimeEntry = (entry: TimeEntry) => {
    if (!currentUser) return;
    
    updateTimeEntryStatus(entry.id, "declined", currentUser.id);
    
    toast({
      title: "Time Entry Declined",
      description: "The time entry has been declined.",
    });
  };
  
  // Status display helper
  const renderTimeEntryStatus = (status: TimeEntryStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            Pending
          </span>
        );
      case 'approved-billable':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
            Approved (Billable)
          </span>
        );
      case 'approved-non-billable':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            Approved (Non-billable)
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
            Declined
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track time spent on tasks and projects
          </p>
        </div>
        <Button onClick={handleAddNewEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Add Manual Entry
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Timers</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="reports">Monthly Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Active Timers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeTimers.length > 0 ? (
                    activeTimers.map(({ task, project, client, timeEntry }) => (
                      <div 
                        key={timeEntry.id} 
                        className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
                      >
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project?.name} • {client?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            Started: {format(new Date(timeEntry.startTime), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No active timers
                    </p>
                  )}
                  
                  <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">Recently Active Tasks</h3>
                    {recentlyActiveTasks.length > 0 ? (
                      <div className="space-y-2">
                        {recentlyActiveTasks.map(item => item && (
                          <div 
                            key={item.task.id} 
                            className="flex justify-between items-center p-3 bg-muted/20 rounded-md"
                          >
                            <div>
                              <h3 className="font-medium">{item.task.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {item.project?.name}
                              </p>
                            </div>
                            <Button 
                              variant="outline"
                              onClick={() => startTimeTracking(item.task.id)}
                              className="border-primary/20 bg-primary/10 hover:bg-primary/20"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Track
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground text-sm">
                        No recently active tasks
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Time Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dates.slice(0, 7).map(date => {
                    const entries = entriesByDate[date];
                    const totalMinutes = getTotalDuration(entries);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    
                    return (
                      <div key={date} className="flex justify-between items-center">
                        <div className="text-sm">
                          {format(new Date(date), "EEE, MMM d")}
                        </div>
                        <div className="font-mono font-medium">
                          {hours}h {minutes}m
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="timesheet" className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <FilterBar 
                filters={filterOptions} 
                onFilterChange={setSelectedFilters} 
              />
              
              <div className="flex-shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({
                            from: range.from,
                            to: range.to || range.from
                          });
                        }
                      }}
                      numberOfMonths={2}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {dates.length > 0 ? (
            dates.map(date => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle>{format(new Date(date), "EEEE, MMMM d, yyyy")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entriesByDate[date].map(entry => {
                      const task = tasks.find(t => t.id === entry.taskId);
                      const project = task ? projects.find(p => p.id === task.projectId) : undefined;
                      const client = project ? clients.find(c => c.id === project.clientId) : 
                                   clients.find(c => c.id === entry.clientId);
                      const user = users.find(u => u.id === entry.userId);
                      
                      return (
                        <div 
                          key={entry.id} 
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-md",
                            entry.manuallyAdded || entry.edited ? "bg-yellow-50/50 dark:bg-yellow-900/10" : "bg-muted/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>{user?.name.slice(0, 2) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{task?.title || "No task"}</p>
                              <div className="flex flex-col text-xs text-muted-foreground">
                                <span>{project?.name || "No project"}</span>
                                <span>{client?.name || "No client"}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col text-sm md:text-center">
                            <p>{entry.notes || "No description"}</p>
                            <div className="mt-2">
                              {renderTimeEntryStatus(entry.status || 'pending')}
                              {(entry.manuallyAdded || entry.edited) && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                  {entry.manuallyAdded ? "Manual entry" : ""}
                                  {entry.manuallyAdded && entry.edited ? ", " : ""}
                                  {entry.edited ? "Edited" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-3">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="font-mono">
                                {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-xs">
                                {format(new Date(entry.startTime), "HH:mm")} - 
                                {entry.endTime ? format(new Date(entry.endTime), " HH:mm") : " now"}
                              </div>
                              
                              {canEditTimeEntry(entry) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditTimeEntry(entry)}>
                                      Edit Time Entry
                                    </DropdownMenuItem>
                                    {canApproveTimeEntry() && entry.status === 'pending' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-green-600 dark:text-green-400"
                                          onClick={() => handleApproveTimeEntry(entry, true)}
                                        >
                                          Approve (Billable)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-blue-600 dark:text-blue-400"
                                          onClick={() => handleApproveTimeEntry(entry, false)}
                                        >
                                          Approve (Non-billable)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-red-600 dark:text-red-400"
                                          onClick={() => handleDeclineTimeEntry(entry)}
                                        >
                                          Decline
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Total:</span>
                      <span className="font-mono font-medium">
                        {Math.floor(getTotalDuration(entriesByDate[date]) / 60)}h {getTotalDuration(entriesByDate[date]) % 60}m
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No time entries match the selected filters
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Time Summary by Client</CardTitle>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(`${month}-01`), "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {monthlyDataByClient.length > 0 ? (
                <div className="space-y-4">
                  {monthlyDataByClient.map(clientData => (
                    <Accordion 
                      type="single" 
                      collapsible 
                      className="border rounded-lg p-2 bg-muted/10"
                      key={clientData.client.id}
                    >
                      <AccordionItem value={clientData.client.id} className="border-none">
                        <AccordionTrigger className="py-3 px-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                {clientData.client.name.charAt(0)}
                              </div>
                              <div className="font-medium">{clientData.client.name}</div>
                            </div>
                            <div className="font-mono font-medium">{formatDuration(clientData.totalMinutes)}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-10">
                            {Object.values(clientData.projectDetails).map(projectData => (
                              <Collapsible key={projectData.project.id} className="border-l-2 pl-4 py-1">
                                <div className="flex items-center justify-between">
                                  <CollapsibleTrigger className="flex items-center gap-1 hover:underline">
                                    <ChevronRight className="h-4 w-4" />
                                    <span>{projectData.project.name}</span>
                                  </CollapsibleTrigger>
                                  <span className="font-mono text-sm">{formatDuration(projectData.totalMinutes)}</span>
                                </div>
                                <CollapsibleContent>
                                  <div className="mt-2 pl-6 space-y-1">
                                    {Object.values(projectData.taskDetails).map(taskData => (
                                      <div key={taskData.task.id} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{taskData.task.title}</span>
                                        <span className="font-mono">{formatDuration(taskData.totalMinutes)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No time entries for this month
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Time Entry Dialog */}
      <EditTimeEntryDialog
        isOpen={isAddEntryDialogOpen}
        onClose={() => setIsAddEntryDialogOpen(false)}
        isNewEntry={true}
      />
      
      {/* Edit Time Entry Dialog */}
      <EditTimeEntryDialog
        timeEntry={selectedTimeEntry}
        isOpen={isEditEntryDialogOpen}
        onClose={() => setIsEditEntryDialogOpen(false)}
      />
    </div>
  );
};

export default TimeTracking;
