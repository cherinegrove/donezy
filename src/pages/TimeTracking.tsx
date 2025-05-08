
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { Play, Clock, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
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

const TimeTracking = () => {
  const { timeEntries, users, tasks, projects, clients, startTimeTracking } = useAppContext();
  const [activeTab, setActiveTab] = useState("recent");
  
  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  
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
  
  // Filter time entries based on selected filters
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
  
  // Get total duration for a given day
  const getTotalDuration = (entries: typeof timeEntries) => {
    return entries.reduce((total, entry) => total + entry.duration, 0);
  };
  
  // Get recent tasks
  const recentTasks = tasks
    .filter(task => task.status !== "done")
    .sort((a, b) => {
      // Sort by most recent time entry
      const aLatest = a.timeEntries.length > 0 
        ? Math.max(...a.timeEntries.map(e => new Date(e.startTime).getTime()))
        : 0;
      const bLatest = b.timeEntries.length > 0 
        ? Math.max(...b.timeEntries.map(e => new Date(e.startTime).getTime()))
        : 0;
      
      if (aLatest === bLatest) {
        // If no time entries or same time, sort by created date
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return bLatest - aLatest;
    })
    .slice(0, 5);
    
  // Generate monthly report data
  const getMonthlyData = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get entries for the selected month
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });
    
    // Group entries by user
    const entriesByUser: Record<string, { 
      user: typeof users[0], 
      totalMinutes: number,
      projectMinutes: Record<string, number>
    }> = {};
    
    monthEntries.forEach(entry => {
      const user = users.find(u => u.id === entry.userId);
      if (!user) return;
      
      const task = tasks.find(t => t.id === entry.taskId);
      if (!task) return;
      
      const projectId = task.projectId;
      
      if (!entriesByUser[user.id]) {
        entriesByUser[user.id] = { 
          user, 
          totalMinutes: 0,
          projectMinutes: {}
        };
      }
      
      entriesByUser[user.id].totalMinutes += entry.duration;
      
      if (!entriesByUser[user.id].projectMinutes[projectId]) {
        entriesByUser[user.id].projectMinutes[projectId] = 0;
      }
      entriesByUser[user.id].projectMinutes[projectId] += entry.duration;
    });
    
    return Object.values(entriesByUser).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };
  
  const monthlyData = getMonthlyData();
  
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground mt-1">
          Track time spent on tasks and projects
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recent">Recent Tasks</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="reports">Monthly Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTasks.length > 0 ? (
                    recentTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      
                      return (
                        <div 
                          key={task.id} 
                          className="flex justify-between items-center p-3 bg-muted/20 rounded-md"
                        >
                          <div>
                            <h3 className="font-medium">{task.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {project?.name}
                            </p>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => startTimeTracking(task.id)}
                            className="border-primary/20 bg-primary/10 hover:bg-primary/20"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Track
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No recent tasks found
                    </p>
                  )}
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
          <FilterBar 
            filters={filterOptions} 
            onFilterChange={setSelectedFilters} 
          />
          
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
                      const client = project ? clients.find(c => c.id === project.clientId) : undefined;
                      const user = users.find(u => u.id === entry.userId);
                      
                      return (
                        <div key={entry.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/20 rounded-md">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>{user?.name.slice(0, 2) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{task?.title}</p>
                              <div className="flex flex-col text-xs text-muted-foreground">
                                <span>{project?.name}</span>
                                <span>{client?.name}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-sm md:text-center">
                            {entry.notes || "No description"}
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-3">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="font-mono">
                                {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                              </span>
                            </div>
                            
                            <div className="text-xs">
                              {format(new Date(entry.startTime), "HH:mm")} - 
                              {entry.endTime ? format(new Date(entry.endTime), " HH:mm") : " now"}
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
              <CardTitle>Monthly Time Summary</CardTitle>
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
              {monthlyData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map(({ user, totalMinutes, projectMinutes }) => {
                      // Get project details
                      const userProjects = Object.entries(projectMinutes).map(([projectId, minutes]) => {
                        const project = projects.find(p => p.id === projectId);
                        return {
                          name: project?.name || "Unknown",
                          minutes
                        };
                      }).sort((a, b) => b.minutes - a.minutes);

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {userProjects.map((project, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>{project.name}</span>
                                  <span className="text-muted-foreground">{formatDuration(project.minutes)}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatDuration(totalMinutes)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No time entries for this month
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimeTracking;
