import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { format, isWithinInterval, parseISO } from "date-fns";
import { CalendarIcon, Download, ChevronRight, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client, TimeEntry, Project, Task } from "@/types";
import { Progress } from "@/components/ui/progress";

// Helper function to calculate total hours from minutes
const minutesToHours = (minutes: number) => {
  return +(minutes / 60).toFixed(1);
};

const Reports = () => {
  const { toast } = useToast();
  const { timeEntries, clients, projects, users, tasks } = useAppContext();
  const [reportType, setReportType] = useState("time");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date()
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [expandedUserClients, setExpandedUserClients] = useState<Record<string, boolean>>({});
  const [expandedUserClientProjects, setExpandedUserClientProjects] = useState<Record<string, boolean>>({});
  
  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: "clients",
      name: "Client",
      options: [], // We'll populate this later
    },
    {
      id: "projects",
      name: "Project",
      options: [], // We'll populate this later
    },
    {
      id: "teams",
      name: "Team",
      options: [], // We'll populate this later
    },
    {
      id: "users",
      name: "Team Member",
      options: [], // We'll populate this later
    },
  ];
  
  const handleFilterChange = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
  };

  // Filter time entries by date range
  const getFilteredTimeEntries = () => {
    if (!dateRange.from && !dateRange.to) return timeEntries;
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      
      if (dateRange.from && dateRange.to) {
        // Set the time of dateRange.to to end of day to include the full day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        return isWithinInterval(entryDate, { 
          start: dateRange.from, 
          end: toDate 
        });
      } else if (dateRange.from) {
        return entryDate >= dateRange.from;
      } else if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return entryDate <= toDate;
      }
      
      return true;
    });
  };

  // Process data for the client hours report
  const getClientHoursData = () => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Group time entries by client
    const hoursByClient = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.clientId) return acc;
      
      if (!acc[entry.clientId]) {
        acc[entry.clientId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.clientId] += entry.duration;
      
      return acc;
    }, {});
    
    // Convert to chart data format
    return clients.map((client: Client) => {
      const totalMinutes = hoursByClient[client.id] || 0;
      return {
        name: client.name,
        hours: minutesToHours(totalMinutes),
        clientId: client.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Get project hours by client
  const getProjectHoursByClient = (clientId: string) => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Get projects for this client
    const clientProjects = projects.filter((project) => project.clientId === clientId);
    
    // Group time entries by project
    const hoursByProject = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.projectId) return acc;
      
      if (!acc[entry.projectId]) {
        acc[entry.projectId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.projectId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return projects with their hours
    return clientProjects.map((project: Project) => {
      const totalMinutes = hoursByProject[project.id] || 0;
      return {
        name: project.name,
        hours: minutesToHours(totalMinutes),
        projectId: project.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Process data for the team member hours report
  const getUserHoursData = () => {
    const filteredEntries = getFilteredTimeEntries();
    
    // Group time entries by user
    const hoursByUser = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.userId) return acc;
      
      if (!acc[entry.userId]) {
        acc[entry.userId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.userId] += entry.duration;
      
      return acc;
    }, {});
    
    // Convert to data format
    return users.map((user) => {
      const totalMinutes = hoursByUser[user.id] || 0;
      return {
        name: user.name,
        hours: minutesToHours(totalMinutes),
        userId: user.id,
      };
    }).sort((a, b) => b.hours - a.hours); // Sort by highest hours first
  };

  // Get client hours by user
  const getClientHoursByUser = (userId: string) => {
    const filteredEntries = getFilteredTimeEntries().filter(entry => entry.userId === userId);
    
    // Group time entries by client
    const hoursByClient = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.clientId) return acc;
      
      if (!acc[entry.clientId]) {
        acc[entry.clientId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.clientId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return clients with their hours
    return clients.map((client) => {
      const totalMinutes = hoursByClient[client.id] || 0;
      if (totalMinutes === 0) return null; // Skip clients with no hours
      
      return {
        name: client.name,
        hours: minutesToHours(totalMinutes),
        clientId: client.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get project hours by user and client
  const getProjectHoursByUserAndClient = (userId: string, clientId: string) => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.userId === userId && entry.clientId === clientId);
    
    // Get projects for this client
    const clientProjects = projects.filter(project => project.clientId === clientId);
    
    // Group time entries by project
    const hoursByProject = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.projectId) return acc;
      
      if (!acc[entry.projectId]) {
        acc[entry.projectId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.projectId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return projects with their hours
    return clientProjects.map((project) => {
      const totalMinutes = hoursByProject[project.id] || 0;
      if (totalMinutes === 0) return null; // Skip projects with no hours
      
      return {
        name: project.name,
        hours: minutesToHours(totalMinutes),
        projectId: project.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get task hours by user, client, and project
  const getTaskHoursByUserClientAndProject = (userId: string, clientId: string, projectId: string) => {
    const filteredEntries = getFilteredTimeEntries()
      .filter(entry => entry.userId === userId && entry.clientId === clientId && entry.projectId === projectId);
    
    // Get tasks for this project
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    
    // Group time entries by task
    const hoursByTask = filteredEntries.reduce((acc: Record<string, number>, entry: TimeEntry) => {
      if (!entry.taskId) return acc;
      
      if (!acc[entry.taskId]) {
        acc[entry.taskId] = 0;
      }
      
      // Add duration in minutes
      acc[entry.taskId] += entry.duration;
      
      return acc;
    }, {});
    
    // Return tasks with their hours
    return projectTasks.map((task: Task) => {
      const totalMinutes = hoursByTask[task.id] || 0;
      if (totalMinutes === 0) return null; // Skip tasks with no hours
      
      return {
        name: task.title,
        hours: minutesToHours(totalMinutes),
        taskId: task.id,
      };
    }).filter(Boolean).sort((a, b) => b!.hours - a!.hours); // Sort by highest hours first
  };

  // Get Project Progress data
  const getProjectProgressData = () => {
    // Filter active projects
    const activeProjects = projects.filter(project => 
      project.status !== 'done'
    );

    return activeProjects.map(project => {
      // Calculate total hours used for this project
      const projectTimeEntries = timeEntries.filter(entry => {
        const task = tasks.find(t => t.id === entry.taskId);
        return task && task.projectId === project.id;
      });

      const totalMinutesUsed = projectTimeEntries.reduce((total, entry) => total + entry.duration, 0);
      const hoursUsed = minutesToHours(totalMinutesUsed);

      // Calculate completion percentage based on tasks
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'done').length;
      const completionPercentage = projectTasks.length > 0 
        ? Math.round((completedTasks / projectTasks.length) * 100)
        : 0;
      
      // Get client info
      const client = clients.find(c => c.id === project.clientId);

      return {
        project,
        client,
        hoursUsed,
        allocatedHours: project.allocatedHours || 0,
        hoursPercentage: project.allocatedHours ? Math.round((hoursUsed / project.allocatedHours) * 100) : 0,
        completionPercentage,
        completedTasks,
        totalTasks: projectTasks.length
      };
    });
  };

  const clientHoursData = getClientHoursData();
  const userHoursData = getUserHoursData();
  const projectProgressData = getProjectProgressData();
  
  const toggleClientExpand = (clientId: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const toggleUserClientExpand = (key: string) => {
    setExpandedUserClients(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleUserClientProjectExpand = (key: string) => {
    setExpandedUserClientProjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and view project reports
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
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
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMMM d, yyyy")
                  )
                ) : dateRange.to ? (
                  format(dateRange.to, "MMMM d, yyyy")
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from) {
                    setDateRange({
                      from: range.from,
                      to: range.to || range.from
                    });
                  } else {
                    setDateRange({ from: undefined, to: undefined });
                  }
                }}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
      
      {reportType === "time" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Hours by Client</CardTitle>
              <CardDescription>
                Click on a client to see projects breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientHoursData.length > 0 ? (
                    clientHoursData.map((client) => (
                      <>
                        <TableRow 
                          key={client.clientId}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => toggleClientExpand(client.clientId)}
                        >
                          <TableCell className="p-2 pl-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedClients[client.clientId] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-right font-medium">{client.hours}h</TableCell>
                        </TableRow>
                        
                        {expandedClients[client.clientId] && (
                          getProjectHoursByClient(client.clientId).map((project) => (
                            <TableRow key={`${client.clientId}-${project.projectId}`} className="bg-muted/40">
                              <TableCell></TableCell>
                              <TableCell className="pl-10">{project.name}</TableCell>
                              <TableCell className="text-right">{project.hours}h</TableCell>
                            </TableRow>
                          ))
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hours by Team Member</CardTitle>
              <CardDescription>
                Click on team members to explore their time breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userHoursData.length > 0 ? (
                    userHoursData.map((user) => (
                      <>
                        <TableRow 
                          key={user.userId}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => toggleUserExpand(user.userId)}
                        >
                          <TableCell className="p-2 pl-4">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedUsers[user.userId] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-right font-medium">{user.hours}h</TableCell>
                        </TableRow>
                        
                        {expandedUsers[user.userId] && (
                          getClientHoursByUser(user.userId).map((client) => client && (
                            <>
                              <TableRow 
                                key={`${user.userId}-${client.clientId}`} 
                                className="bg-muted/30 cursor-pointer hover:bg-muted/40"
                                onClick={() => toggleUserClientExpand(`${user.userId}-${client.clientId}`)}
                              >
                                <TableCell className="p-2 pl-10">
                                  <Button variant="ghost" size="icon" className="h-5 w-5">
                                    {expandedUserClients[`${user.userId}-${client.clientId}`] ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="pl-8">{client.name}</TableCell>
                                <TableCell className="text-right">{client.hours}h</TableCell>
                              </TableRow>

                              {expandedUserClients[`${user.userId}-${client.clientId}`] && (
                                getProjectHoursByUserAndClient(user.userId, client.clientId).map(project => project && (
                                  <>
                                    <TableRow 
                                      key={`${user.userId}-${client.clientId}-${project.projectId}`}
                                      className="bg-muted/50 cursor-pointer hover:bg-muted/60"
                                      onClick={() => toggleUserClientProjectExpand(`${user.userId}-${client.clientId}-${project.projectId}`)}
                                    >
                                      <TableCell className="p-1 pl-16">
                                        <Button variant="ghost" size="icon" className="h-4 w-4">
                                          {expandedUserClientProjects[`${user.userId}-${client.clientId}-${project.projectId}`] ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </TableCell>
                                      <TableCell className="pl-14">{project.name}</TableCell>
                                      <TableCell className="text-right">{project.hours}h</TableCell>
                                    </TableRow>

                                    {expandedUserClientProjects[`${user.userId}-${client.clientId}-${project.projectId}`] && (
                                      getTaskHoursByUserClientAndProject(user.userId, client.clientId, project.projectId).map(task => task && (
                                        <TableRow 
                                          key={`${user.userId}-${client.clientId}-${project.projectId}-${task.taskId}`}
                                          className="bg-muted/70"
                                        >
                                          <TableCell></TableCell>
                                          <TableCell className="pl-20 text-sm">{task.name}</TableCell>
                                          <TableCell className="text-right">{task.hours}h</TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </>
                                ))
                              )}
                            </>
                          ))
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      
      {reportType === "progress" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Project Hours Utilization</CardTitle>
              <CardDescription>
                Hours used vs hours allocated for active projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Hours Used</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead>Hours Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProgressData.length > 0 ? (
                    projectProgressData.map((item) => (
                      <TableRow key={item.project.id}>
                        <TableCell className="font-medium">{item.project.name}</TableCell>
                        <TableCell>{item.client?.name || "No Client"}</TableCell>
                        <TableCell className="text-right font-mono">{item.hoursUsed}h</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.allocatedHours ? `${item.allocatedHours}h` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={item.hoursPercentage} 
                              className="h-2"
                              indicatorColor={
                                item.hoursPercentage > 90 ? "bg-destructive" : 
                                item.hoursPercentage > 75 ? "bg-warning" : 
                                "bg-primary"
                              }
                            />
                            <span className="text-xs w-12 text-right font-medium">
                              {item.hoursPercentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No active projects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Project Completion Status</CardTitle>
              <CardDescription>
                Task completion progress for active projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead>Completion Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProgressData.length > 0 ? (
                    projectProgressData.map((item) => (
                      <TableRow key={`status-${item.project.id}`}>
                        <TableCell className="font-medium">{item.project.name}</TableCell>
                        <TableCell>{item.client?.name || "No Client"}</TableCell>
                        <TableCell className="text-right">
                          {item.completedTasks} / {item.totalTasks}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={item.completionPercentage} 
                              className="h-2"
                            />
                            <span className="text-xs w-12 text-right font-medium">
                              {item.completionPercentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No active projects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
