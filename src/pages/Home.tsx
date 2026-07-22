import { useState, lazy, Suspense } from "react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";
import { RecentTasksCard } from "@/components/dashboard/cards/RecentTasksCard";
import { NotificationsCard } from "@/components/dashboard/cards/NotificationsCard";
import { TaskRemindersCard } from "@/components/dashboard/cards/TaskRemindersCard";
import { MyTimeTrackingCard } from "@/components/dashboard/cards/MyTimeTrackingCard";
import { MyDailyTimeChart } from "@/components/dashboard/cards/MyDailyTimeChart";
import { ActiveTimersCard } from "@/components/dashboard/cards/ActiveTimersCard";
import { MonthlyComparisonChart } from "@/components/dashboard/cards/MonthlyComparisonChart";
import { MentionsCard } from "@/components/dashboard/cards/MentionsCard";
import { ProjectWarningsCard } from "@/components/dashboard/cards/ProjectWarningsCard";

const Home = () => {
  const { tasks, projects, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const today = startOfToday();

  // Filter tasks for current user
  const filteredTasks = tasks.filter(task => 
    task.assigneeId === currentUser?.id || 
    task.collaboratorIds?.includes(currentUser?.id)
  );

  // Filter projects for current user
  const filteredProjects = projects.filter(project => 
    project.ownerId === currentUser?.id ||
    project.collaboratorIds?.includes(currentUser?.id) ||
    project.teamIds?.includes(currentUser?.id) ||
    project.watcherIds?.includes(currentUser?.id) ||
    tasks.some(task => 
      task.projectId === project.id && 
      (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id))
    )
  );

  // Tasks due today
  const tasksDueToday = filteredTasks.filter(task => 
    task.dueDate && isToday(parseISO(task.dueDate)) && task.status !== "done"
  );

  // Overdue tasks
  const overdueTasks = filteredTasks.filter(task => 
    task.dueDate && 
    isBefore(parseISO(task.dueDate), today) &&
    task.status !== "done"
  );

  // All active tasks (excluding done)
  const activeTasks = filteredTasks.filter(task => task.status !== "done");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      case "planning":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}! Here's what you need to focus on today.
        </p>
      </div>

      {/* Row 1: Active Status - Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActiveTimersCard />
        <MyTimeTrackingCard />
        <MyDailyTimeChart />
      </div>

      {/* Row 2: Tasks - Urgent Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {overdueTasks.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
                  />
                ))}
                {overdueTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    +{overdueTasks.length - 5} more overdue tasks
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No overdue tasks
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
              <Calendar className="h-5 w-5" />
              Tasks Due Today ({tasksDueToday.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksDueToday.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasksDueToday.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    displayOptions={["priority", "project", "client", "assignee"]}
                  />
                ))}
                {tasksDueToday.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    +{tasksDueToday.length - 5} more tasks due today
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No tasks due today
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Analytics & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyComparisonChart />
        <ProjectWarningsCard />
      </div>

      {/* Row 4: Communications & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MentionsCard />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationsCard userId={currentUser?.id} />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Activity & Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Task Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskRemindersCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recently Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTasksCard />
          </CardContent>
        </Card>
      </div>

      {/* Row 6: All Tasks Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All My Active Tasks ({activeTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTasks.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              No active tasks found
            </p>
          )}
        </CardContent>
      </Card>

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

export default Home;
