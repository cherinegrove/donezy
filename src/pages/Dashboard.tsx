
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, isBefore, parseISO, startOfToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useState } from "react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { tasks, projects, clients, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Count tasks by status
  const tasksByStatus = {
    backlog: tasks.filter((task) => task.status === "backlog").length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inProgress: tasks.filter((task) => task.status === "in-progress").length,
    review: tasks.filter((task) => task.status === "review").length,
    done: tasks.filter((task) => task.status === "done").length,
  };

  // Format data for status chart
  const statusChartData = [
    { name: "Backlog", value: tasksByStatus.backlog },
    { name: "To Do", value: tasksByStatus.todo },
    { name: "In Progress", value: tasksByStatus.inProgress },
    { name: "Review", value: tasksByStatus.review },
    { name: "Done", value: tasksByStatus.done },
  ];

  // Tasks assigned to me
  const myTasks = tasks.filter((task) => 
    task.assigneeIds.includes(currentUser?.id || "") && 
    task.status !== "done"
  );

  // Overdue tasks
  const today = startOfToday();
  const overdueTasks = tasks.filter((task) => 
    task.dueDate && 
    isBefore(parseISO(task.dueDate), today) &&
    task.status !== "done"
  );

  // Recent activity (using time entries as proxy)
  const recentActivity = tasks
    .flatMap(task => 
      task.timeEntries.map(entry => ({
        taskId: task.id,
        taskTitle: task.title,
        ...entry
      }))
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  // Project completion
  const projectCompletionData = projects.map(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === "done").length;
    const completionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    
    return {
      name: project.name,
      completion: completionPercentage
    };
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasksByStatus.todo + tasksByStatus.inProgress + tasksByStatus.review}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Project Completion</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="completion"
                  nameKey="name"
                  label={(entry) => `${entry.name}: ${entry.completion}%`}
                >
                  {projectCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Tasks</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {myTasks.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
            {myTasks.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">
                No tasks assigned to you
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Overdue</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {overdueTasks.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
            {overdueTasks.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">
                No overdue tasks
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {recentActivity.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
              onClick={() => {
                const task = tasks.find(t => t.id === activity.taskId);
                if (task) handleTaskClick(task);
              }}
            >
              <div>
                <p className="font-medium">{activity.taskTitle}</p>
                <p className="text-sm text-muted-foreground">
                  Time tracked: {Math.floor(activity.duration / 60)}h {activity.duration % 60}m
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {format(new Date(activity.startTime), "MMM d, yyyy")}
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-center py-6 text-muted-foreground">
              No recent activity
            </p>
          )}
        </div>
      </div>

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
};

export default Dashboard;
