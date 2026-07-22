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
  const { tasks, projects, users, currentUser } = useAppContext();
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

  // Compact task list row component
  const CompactTaskRow = ({ task }: { task: Task }) => {
    const project = projects.find(p => p.id === task.projectId);
    const assignee = users.find(u => u.id === task.assigneeId);
    const collaborators = (task.collaboratorIds || [])
      .map(id => users.find(u => u.id === id))
      .filter(Boolean);

    return (
      <div
        onClick={() => handleTaskClick(task)}
        className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer transition-colors border-b last:border-b-0 gap-4"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground">{project?.name || "No Project"}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
          {task.dueDate && <span>{format(parseISO(task.dueDate), "MMM dd")}</span>}
          {assignee && <span className="text-blue-600 dark:text-blue-400">{assignee.name}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}! Here's what you need to focus on today.
        </p>
      </div>

      {/* Row 1: Active Status - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActiveTimersCard />
        <MyTimeTrackingCard />
      </div>

      {/* Row 2: Tasks - Urgent Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Overdue ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {overdueTasks.length > 0 ? (
              <div className="max-h-40 overflow-y-auto">
                {overdueTasks.map((task) => (
                  <CompactTaskRow key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-4 text-muted-foreground">No overdue tasks</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800 dark:text-orange-400">
              <Calendar className="h-4 w-4" />
              Due Today ({tasksDueToday.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {tasksDueToday.length > 0 ? (
              <div className="max-h-40 overflow-y-auto">
                {tasksDueToday.map((task) => (
                  <CompactTaskRow key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-4 text-muted-foreground">No tasks due today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Compact Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            <MentionsCard />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationsCard userId={currentUser?.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskRemindersCard />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recently Updated Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recently Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTasksCard />
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
