import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Play, Clock, Calendar, ChevronDown, ChevronRight, Plus, Pause, Square, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const TimeTracking = () => {
  const { timeEntries, users, tasks, projects, clients, startTimeTracking, activeTimeEntry, currentUser, updateTimeEntryStatus, stopTimeTracking, isTimerPaused, pauseTimeTracking, resumeTimeTracking, getElapsedTime, customRoles } = useAppContext();
  const [activeTab, setActiveTab] = useState("active");
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | undefined>(undefined);
  const [isEditEntryDialogOpen, setIsEditEntryDialogOpen] = useState(false);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopNotes, setStopNotes] = useState("");
  
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

  // Update current time every second for active timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

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
    // Get task and project (but don't filter out if missing)
    const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
    const project = task ? projects.find(p => p.id === task.projectId) : 
                   (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
    
    // Check user filter
    if (selectedFilters.user?.length > 0 && !selectedFilters.user.includes(entry.userId)) {
      return false;
    }
    
    // Check project filter - only apply if we have projects and the filter is set
    if (selectedFilters.project?.length > 0) {
      const entryProjectId = task?.projectId || entry.projectId;
      if (!entryProjectId || !selectedFilters.project.includes(entryProjectId)) {
        return false;
      }
    }
    
    // Check client filter - try multiple ways to get client ID
    if (selectedFilters.client?.length > 0) {
      const entryClientId = project?.clientId || entry.clientId;
      if (!entryClientId || !selectedFilters.client.includes(entryClientId)) {
        return false;
      }
    }
    
    // Check date range
    if (dateRange.from || dateRange.to) {
      const entryDate = new Date(entry.startTime);
      
      if (dateRange.from && dateRange.to) {
        const inRange = isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
        if (!inRange) {
          return false;
        }
      } else if (dateRange.from) {
        if (entryDate < dateRange.from) {
          return false;
        }
      } else if (dateRange.to) {
        if (entryDate > dateRange.to) {
          return false;
        }
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

  // Get active timer with shared elapsed time calculation
  const getActiveTimer = () => {
    if (!activeTimeEntry) {
      return null;
    }
    
    const task = tasks.find(t => t.id === activeTimeEntry.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : undefined;
    const client = project ? clients.find(c => c.id === project.clientId) : undefined;
    const user = users.find(u => u.id === activeTimeEntry.userId);
    
    return {
      task,
      project,
      client,
      user,
      timeEntry: activeTimeEntry,
      elapsedTime: getElapsedTime(activeTimeEntry)
    };
  };
  
  // Get total duration for a given day
  const getTotalDuration = (entries: typeof timeEntries) => {
    return entries.reduce((total, entry) => total + entry.duration, 0);
  };
  
  // Active timer for the Active tab
  const activeTimer = getActiveTimer();
  
  // Generate monthly report data grouped by client - only approved timers
  const getMonthlyDataByClient = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get entries for the selected month - only approved timers
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const isInMonth = entryDate >= startDate && entryDate <= endDate;
      const isApproved = entry.status === 'approved-billable' || entry.status === 'approved-non-billable';
      return isInMonth && isApproved;
    });
    
    // Group entries by client first
    const entriesByClient: Record<string, { 
      client: typeof clients[0] | { id: string, name: string },
      totalMinutes: number,
      projectDetails: Record<string, {
        project: typeof projects[0] | { id: string, name: string },
        totalMinutes: number,
        taskDetails: Record<string, {
          task: typeof tasks[0] | { id: string, title: string },
          totalMinutes: number,
          entries: typeof timeEntries
        }>
      }>
    }> = {};
    
    // Process all entries
    monthEntries.forEach(entry => {
      // Try to get task, project, and client, but use fallbacks if not found
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      // Use fallbacks for missing data
      const finalTask = task || { id: 'manual-' + entry.id, title: 'Manual Time Entry' };
      const finalProject = project || { id: 'no-project-' + entry.id, name: 'No Project' };
      const finalClient = client || { id: 'no-client-' + entry.id, name: 'No Client' };
      
      // Initialize client entry if needed
      if (!entriesByClient[finalClient.id]) {
        entriesByClient[finalClient.id] = { 
          client: finalClient, 
          totalMinutes: 0,
          projectDetails: {}
        };
      }
      
      // Add to client total
      entriesByClient[finalClient.id].totalMinutes += entry.duration;
      
      // Initialize project entry if needed
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id] = {
          project: finalProject,
          totalMinutes: 0,
          taskDetails: {}
        };
      }
      
      // Add to project total
      entriesByClient[finalClient.id].projectDetails[finalProject.id].totalMinutes += entry.duration;
      
      // Initialize task entry if needed
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id] = {
          task: finalTask,
          totalMinutes: 0,
          entries: []
        };
      }
      
      // Add to task total and entries
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].totalMinutes += entry.duration;
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].entries.push(entry);
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
    
    // Admins can edit any entry
    if (currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin') return true;
    
    return false;
  };

  // Checks if current user can approve/decline a time entry
  const canApproveTimeEntry = () => {
    // Only admins can approve/decline time entries
    return currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin';
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

  // Timer control handlers using AppContext
  const handlePauseTimer = async () => {
    console.log('🔸 TimeTracking: Pause/Resume clicked');
    if (isTimerPaused) {
      await resumeTimeTracking();
      console.log('▶️ Timer resumed');
    } else {
      pauseTimeTracking();
      console.log('⏸️ Timer paused');
    }
  };

  const handleStopTimer = () => {
    console.log('🛑 TimeTracking: Stop timer clicked');
    setStopDialogOpen(true);
  };

  const confirmStopTimer = async () => {
    try {
      console.log('💾 TimeTracking: Confirming stop timer with notes:', stopNotes);
      await stopTimeTracking(stopNotes);
      setStopDialogOpen(false);
      setStopNotes("");
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
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
        <Button onClick={() => {
          console.log('🟢 ADD MANUAL ENTRY BUTTON CLICKED');
          handleAddNewEntry();
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Manual Entry
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Timers</TabsTrigger>
          <TabsTrigger value="timesheet">Time Logs</TabsTrigger>
          <TabsTrigger value="reports">Monthly Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Timer List</CardTitle>
              <p className="text-sm text-muted-foreground">All unsaved timers (running and paused)</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Backend Active Timer */}
                {activeTimer && (
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <div className="flex items-center gap-3">
                      <Clock className={cn(
                        "h-5 w-5 text-green-600 dark:text-green-400",
                        !isTimerPaused && "animate-pulse"
                      )} />
                      <div>
                        <h3 className="font-medium text-green-800 dark:text-green-200">
                          {activeTimer.task?.title || "Unknown Task"}
                        </h3>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {activeTimer.project?.name || "No project"} • {activeTimer.client?.name || "No client"}
                        </p>
                        <p className="text-xs text-green-500 dark:text-green-500">
                          Started: {format(new Date(activeTimer.timeEntry.startTime), "HH:mm")}
                          {isTimerPaused && " • PAUSED"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-green-700 dark:text-green-300">
                          {activeTimer.elapsedTime}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Running by {activeTimer.user?.name || "Unknown"}
                        </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={handlePauseTimer}
                           className={cn(
                             "h-8 w-8 p-0",
                             isTimerPaused ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"
                           )}
                         >
                           {isTimerPaused ? (
                             <Play className="h-4 w-4" />
                           ) : (
                             <Pause className="h-4 w-4" />
                           )}
                         </Button>
                         
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={handleStopTimer}
                           className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                         >
                           <Square className="h-4 w-4" />
                         </Button>
                         
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => {
                             console.log('✏️ TimeTracking: Edit button clicked for active timer');
                             setSelectedTimeEntry(activeTimer.timeEntry);
                             setIsEditEntryDialogOpen(true);
                           }}
                           className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                       </div>
                    </div>
                  </div>
                )}

                {/* TODO: Add local timers from TimerBox here */}
                {/* This would require integrating with the TimerBox component or shared state */}
                
                {!activeTimer && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">No active timers</p>
                    <p className="text-sm">Start a timer from a task or project to track your time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
                      const project = task ? projects.find(p => p.id === task.projectId) : 
                                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
                      const client = project ? clients.find(c => c.id === project.clientId) : 
                                   (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
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
                              <p className="font-medium">{task?.title || "Manual Time Entry"}</p>
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
                <div className="space-y-2">
                  <p className="text-lg">No time entries found</p>
                  <p className="text-sm">
                    {timeEntries.length === 0 
                      ? "You haven't created any time entries yet. Start a timer from a task to create your first entry!"
                      : "No time entries match the selected filters. Try adjusting your filters or date range."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly Summary - Approved Time Only</CardTitle>
                <p className="text-sm text-muted-foreground">Shows only approved billable and non-billable time entries</p>
              </div>
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
      
      {/* Stop Timer Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {activeTimer && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Task</p>
                  <p>{activeTimer.task?.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Time Elapsed</p>
                  <p className="font-mono text-lg">{activeTimer.elapsedTime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <Textarea 
                    placeholder="What did you work on?" 
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStopTimer}>Save Time Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTracking;
