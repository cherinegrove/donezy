
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Play, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const TimeTracking = () => {
  const { timeEntries, users, tasks, projects, startTimeTracking } = useAppContext();
  const [activeTab, setActiveTab] = useState("recent");

  // Get unique dates from time entries
  const dates = [...new Set(timeEntries.map(entry => 
    format(new Date(entry.startTime), "yyyy-MM-dd")
  ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Group time entries by date
  const entriesByDate = dates.reduce((acc, date) => {
    acc[date] = timeEntries.filter(entry => 
      format(new Date(entry.startTime), "yyyy-MM-dd") === date
    );
    return acc;
  }, {} as Record<string, typeof timeEntries>);

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
          <TabsTrigger value="reports">Reports</TabsTrigger>
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
          {dates.map(date => (
            <Card key={date}>
              <CardHeader>
                <CardTitle>{format(new Date(date), "EEEE, MMMM d, yyyy")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entriesByDate[date].map(entry => {
                    const task = tasks.find(t => t.id === entry.taskId);
                    const project = task ? projects.find(p => p.id === task.projectId) : undefined;
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
                            <p className="text-xs text-muted-foreground">
                              {project?.name}
                            </p>
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
          ))}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Reports</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Time reporting features will be available soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimeTracking;
