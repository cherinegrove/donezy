import { useState } from "react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";
import { RecentTasksCard } from "@/components/dashboard/cards/RecentTasksCard";
import { NotificationsCard } from "@/components/dashboard/cards/NotificationsCard";
import { TaskRemindersCard } from "@/components/dashboard/cards/TaskRemindersCard";
import { MyTimeTrackingCard } from "@/components/dashboard/cards/MyTimeTrackingCard";
import { MyDailyTimeChart } from "@/components/dashboard/cards/MyDailyTimeChart";

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Home</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}!
        </p>
      </div>

      {/* Personal Daily Time Chart - Full Width at Top */}
      <MyDailyTimeChart />

      {/* Static 2-column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length > 0 ? (
              <div className="space-y-2">
                {overdueTasks.map((task) => (
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
                No overdue tasks
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calendar className="h-5 w-5" />
              Tasks Due Today ({tasksDueToday.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksDueToday.length > 0 ? (
              <div className="space-y-2">
                {tasksDueToday.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    displayOptions={["priority", "project", "client", "assignee"]}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No tasks due today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Row 2: My Unread Notifications | My Task Reminders Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>My Unread Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationsCard userId={currentUser?.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>My Task Reminders Today</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskRemindersCard />
          </CardContent>
        </Card>

        {/* Row 3: Tasks Updated This Week */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Tasks Updated This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTasksCard />
          </CardContent>
        </Card>

        {/* Empty cell */}
        <div></div>

        {/* Row 4: All My Tasks | All My Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              All My Tasks ({activeTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTasks.length > 0 ? (
              <div className="space-y-2">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All My Projects ({filteredProjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProjects.length > 0 ? (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/30 transition-all"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-base">{project.name}</h4>
                      <Badge className={getProjectStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {project.dueDate && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(parseISO(project.dueDate), "MMM dd, yyyy")}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {project.usedHours || 0}/{project.allocatedHours || 0}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No projects found
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: My Time Tracking - Full Width */}
      <div className="mt-6">
        <MyTimeTrackingCard />
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

export default Home;
