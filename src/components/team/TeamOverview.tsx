
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { Task, User } from "@/types";

export const TeamOverview = () => {
  const { users, tasks, teams, currentUser } = useAppContext();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Filter to only show team members for teams the current user manages
  const managedTeamIds = currentUser?.role === "admin" || currentUser?.role === "manager" 
    ? teams.map(team => team.id) 
    : [];
    
  const teamMembers = users.filter(user => 
    user.teamIds.some(teamId => managedTeamIds.includes(teamId)) &&
    (currentUser?.id !== user.id) && // Exclude current user
    user.role !== "client" // Exclude client users
  );

  // Get tasks assigned to selected user or all team members if none selected
  const getRelevantTasks = (): Task[] => {
    if (selectedUserId) {
      return tasks.filter(task => task.assigneeIds.includes(selectedUserId));
    } else {
      // Get all tasks assigned to team members
      return tasks.filter(task => 
        task.assigneeIds.some(assigneeId => 
          teamMembers.some(member => member.id === assigneeId)
        )
      );
    }
  };

  const relevantTasks = getRelevantTasks();
  
  // Get tasks by status
  const getTasksByStatus = () => {
    const statusCounts = {
      backlog: 0,
      todo: 0,
      "in-progress": 0,
      review: 0,
      done: 0
    };
    
    relevantTasks.forEach(task => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
      count
    }));
  };
  
  // Calculate weekly productivity (tasks completed per week)
  const getWeeklyProductivity = () => {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now);
    const endOfCurrentWeek = endOfWeek(now);
    
    const completedTasksThisWeek = relevantTasks.filter(task => 
      task.status === "done" && 
      task.completedAt && 
      parseISO(task.completedAt) >= startOfCurrentWeek &&
      parseISO(task.completedAt) <= endOfCurrentWeek
    );
    
    return completedTasksThisWeek.length;
  };

  // Calculate overdue tasks
  const getOverdueTasks = () => {
    const now = new Date();
    
    return relevantTasks.filter(task => 
      task.status !== "done" && 
      task.dueDate && 
      parseISO(task.dueDate) < now
    ).length;
  };
  
  // Calculate total hours tracked for the selected user or team
  const getTotalHoursTracked = () => {
    let totalMinutes = 0;
    
    relevantTasks.forEach(task => {
      task.timeEntries.forEach(entry => {
        if (!selectedUserId || entry.userId === selectedUserId) {
          totalMinutes += entry.duration;
        }
      });
    });
    
    return Math.round(totalMinutes / 60);
  };
  
  // For the pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {selectedUserId 
            ? `Team Member: ${users.find(u => u.id === selectedUserId)?.name || 'Unknown'}`
            : "Team Overview"
          }
        </h2>
        
        {selectedUserId && (
          <Button variant="outline" onClick={() => setSelectedUserId(null)}>
            View All Team
          </Button>
        )}
      </div>
      
      {!selectedUserId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map(member => (
            <Button
              key={member.id}
              variant="outline"
              className="flex items-center justify-start space-x-2 p-4 h-auto"
              onClick={() => setSelectedUserId(member.id)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>
                  {member.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
              </div>
            </Button>
          ))}
        </div>
      )}
      
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relevantTasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {relevantTasks.filter(task => task.status === "done").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getOverdueTasks()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hours Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getTotalHoursTracked()}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task status distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTasksByStatus()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Team productivity */}
        <Card>
          <CardHeader>
            <CardTitle>Team Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Completed", value: relevantTasks.filter(t => t.status === "done").length },
                    { name: "In Progress", value: relevantTasks.filter(t => t.status === "in-progress").length },
                    { name: "To Do", value: relevantTasks.filter(t => t.status === "todo").length },
                    { name: "Review", value: relevantTasks.filter(t => t.status === "review").length },
                    { name: "Backlog", value: relevantTasks.filter(t => t.status === "backlog").length }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {getTasksByStatus().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* User-specific stats when a user is selected */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Member Details: {users.find(u => u.id === selectedUserId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col p-4 bg-muted/20 rounded-lg">
                <span className="text-sm text-muted-foreground">Weekly Completed</span>
                <span className="text-2xl font-bold">{getWeeklyProductivity()}</span>
              </div>
              
              <div className="flex flex-col p-4 bg-muted/20 rounded-lg">
                <span className="text-sm text-muted-foreground">Hours Tracked</span>
                <span className="text-2xl font-bold">{getTotalHoursTracked()}</span>
              </div>
              
              <div className="flex flex-col p-4 bg-muted/20 rounded-lg">
                <span className="text-sm text-muted-foreground">Overdue Tasks</span>
                <span className="text-2xl font-bold">{getOverdueTasks()}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recent Activity</h3>
              <div className="space-y-2">
                {relevantTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className="capitalize">{task.status.replace('-', ' ')}</span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "No due date"}
                    </div>
                  </div>
                ))}
                
                {relevantTasks.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">
                    No tasks assigned
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
