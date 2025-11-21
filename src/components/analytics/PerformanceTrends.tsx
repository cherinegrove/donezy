import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, TimeEntry, Client } from "@/types";
import { startOfWeek, format, subWeeks, isWithinInterval } from "date-fns";

interface User {
  id: string;
  name: string;
}

interface PerformanceTrendsProps {
  tasks: Task[];
  timeEntries: TimeEntry[];
  clients: Client[];
  users: User[];
}

export function PerformanceTrends({ tasks, timeEntries, clients, users }: PerformanceTrendsProps) {
  // Team Velocity - tasks completed per week over last 8 weeks
  const weeklyVelocity = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 7 - i));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const completedTasks = tasks.filter(task => {
      if (task.status !== 'done') return false;
      const createdDate = new Date(task.createdAt);
      return isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
    });

    return {
      week: format(weekStart, 'MMM d'),
      completed: completedTasks.length,
      points: completedTasks.reduce((sum, task) => {
        const priority = task.priority;
        const points = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
        return sum + points;
      }, 0)
    };
  });

  // Client Health Score - based on overdue tasks and time tracking
  const clientHealth = clients.map(client => {
    const clientTimeEntries = timeEntries.filter(e => e.clientId === client.id);
    const totalHours = clientTimeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    const billableHours = clientTimeEntries.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    
    const billableRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 100;
    
    return {
      name: client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name,
      health: Math.round(billableRate),
      hours: Math.round(totalHours)
    };
  }).filter(item => item.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  // Individual Productivity - tasks completed vs time logged
  const userProductivity = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id && t.status === 'done');
    const userTime = timeEntries.filter(e => e.userId === user.id);
    const totalHours = userTime.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    
    const efficiency = totalHours > 0 ? userTasks.length / (totalHours / 10) : 0;
    
    return {
      name: user.name,
      tasksCompleted: userTasks.length,
      hoursLogged: Math.round(totalHours),
      efficiency: Math.round(efficiency * 10) / 10
    };
  }).filter(item => item.hoursLogged > 0)
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Team Velocity Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Tasks completed and story points per week</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklyVelocity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="completed" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Tasks Completed" />
              <Area type="monotone" dataKey="points" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Story Points" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Health Scores</CardTitle>
          <p className="text-sm text-muted-foreground">Billable rate percentage by client</p>
        </CardHeader>
        <CardContent>
          {clientHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={clientHealth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} name="Health %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No client data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Efficiency</CardTitle>
          <p className="text-sm text-muted-foreground">Tasks completed per 10 hours logged</p>
        </CardHeader>
        <CardContent>
          {userProductivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userProductivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" strokeWidth={2} name="Efficiency Score" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No productivity data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
