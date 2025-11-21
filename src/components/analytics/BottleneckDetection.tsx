import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, Project } from "@/types";
import { differenceInDays } from "date-fns";

interface User {
  id: string;
  name: string;
}

interface BottleneckDetectionProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

export function BottleneckDetection({ tasks, projects, users }: BottleneckDetectionProps) {
  // Stuck Tasks Analysis - tasks in progress for more than 7 days
  const stuckTasks = tasks.filter(task => {
    if (task.status !== 'in-progress') return false;
    const daysSinceCreated = differenceInDays(new Date(), new Date(task.createdAt));
    return daysSinceCreated > 7;
  });

  const stuckTasksByProject = projects.map(project => {
    const projectStuckTasks = stuckTasks.filter(t => t.projectId === project.id);
    return {
      name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
      stuckTasks: projectStuckTasks.length,
      color: projectStuckTasks.length > 5 ? '#ef4444' : projectStuckTasks.length > 2 ? '#f59e0b' : '#10b981'
    };
  }).filter(item => item.stuckTasks > 0)
    .sort((a, b) => b.stuckTasks - a.stuckTasks)
    .slice(0, 8);

  // User Capacity Analysis
  const userTaskLoad = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id && t.status !== 'done');
    const overdueTasks = userTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date() > new Date(t.dueDate);
    });

    return {
      name: user.name,
      activeTasks: userTasks.length,
      overdue: overdueTasks.length,
      color: userTasks.length > 10 ? '#ef4444' : userTasks.length > 5 ? '#f59e0b' : '#10b981'
    };
  }).filter(item => item.activeTasks > 0)
    .sort((a, b) => b.activeTasks - a.activeTasks)
    .slice(0, 8);

  // Status Bottlenecks
  const statusDistribution = [
    { status: 'Backlog', count: tasks.filter(t => t.status === 'backlog').length },
    { status: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
    { status: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length },
    { status: 'Review', count: tasks.filter(t => t.status === 'review').length },
  ].map(item => ({
    ...item,
    color: item.status === 'In Progress' && item.count > 20 ? '#f59e0b' : 
           item.status === 'Backlog' && item.count > 30 ? '#ef4444' : '#8b5cf6'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Stuck Tasks by Project</CardTitle>
          <p className="text-sm text-muted-foreground">Tasks in progress for over 7 days</p>
        </CardHeader>
        <CardContent>
          {stuckTasksByProject.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stuckTasksByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stuckTasks" name="Stuck Tasks">
                  {stuckTasksByProject.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No stuck tasks detected
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Capacity</CardTitle>
          <p className="text-sm text-muted-foreground">Active task load per team member</p>
        </CardHeader>
        <CardContent>
          {userTaskLoad.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userTaskLoad}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="activeTasks" name="Active Tasks" fill="#8b5cf6" />
                <Bar dataKey="overdue" name="Overdue" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No task assignments found
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Workflow Status Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">Task distribution across workflow stages</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="Tasks">
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
