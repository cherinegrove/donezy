import { useState } from "react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, User } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task, Project } from "@/types";
import { CardSelector, CardType } from "@/components/dashboard/CardSelector";
import { CollaboratorTasksCard } from "@/components/dashboard/cards/CollaboratorTasksCard";
import { TimeLogsCard } from "@/components/dashboard/cards/TimeLogsCard";
import { NotesCard } from "@/components/dashboard/cards/NotesCard";
import { RecentTasksCard } from "@/components/dashboard/cards/RecentTasksCard";
import { NotificationsCard } from "@/components/dashboard/cards/NotificationsCard";

const Home = () => {
  const { tasks, projects, users, currentUser } = useAppContext();
  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<CardType[]>(["time-logs", "notes"]);

  const today = startOfToday();
  const isAdminOrManager = currentUser?.role === "admin" || currentUser?.role === "manager";

  // Filter tasks based on selected user
  const getFilteredTasks = () => {
    if (selectedUserId === "me") {
      return tasks.filter(task => 
        task.assigneeId === currentUser?.id || 
        task.collaboratorIds?.includes(currentUser?.id)
      );
    }
    return tasks.filter(task => 
      task.assigneeId === selectedUserId || 
      task.collaboratorIds?.includes(selectedUserId)
    );
  };

  // Filter projects based on selected user
  const getFilteredProjects = () => {
    if (selectedUserId === "me") {
      return projects.filter(project => 
        project.teamIds?.includes(currentUser?.id) ||
        project.watcherIds?.includes(currentUser?.id) ||
        tasks.some(task => 
          task.projectId === project.id && 
          (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id))
        )
      );
    }
    return projects.filter(project => 
      project.teamIds?.includes(selectedUserId) ||
      project.watcherIds?.includes(selectedUserId) ||
      tasks.some(task => 
        task.projectId === project.id && 
        (task.assigneeId === selectedUserId || task.collaboratorIds?.includes(selectedUserId))
      )
    );
  };

  const filteredTasks = getFilteredTasks();
  const filteredProjects = getFilteredProjects();

  // Tasks due today
  const tasksDueToday = filteredTasks.filter(task => 
    task.dueDate && isToday(parseISO(task.dueDate)) && task.status !== "done"
  );

  console.log("Tasks due today:", tasksDueToday);
  console.log("All filtered tasks:", filteredTasks);
  console.log("Tasks with due dates:", filteredTasks.filter(t => t.dueDate));

  // Overdue high priority tasks
  const overdueHighRiskTasks = filteredTasks.filter(task => 
    task.dueDate && 
    isBefore(parseISO(task.dueDate), today) &&
    task.status !== "done" &&
    task.priority === "high"
  );

  console.log("Overdue high risk tasks:", overdueHighRiskTasks);
  console.log("Today:", today);

  // All user tasks (excluding done)
  const activeTasks = filteredTasks.filter(task => task.status !== "done");

  // Projects sorted by due date
  const projectsSortedByDueDate = filteredProjects
    .filter(project => project.dueDate)
    .sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleCardToggle = (cardId: CardType) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const renderCard = (cardType: CardType) => {
    const onRemove = () => handleCardToggle(cardType);
    
    switch (cardType) {
      case "collaborator-tasks":
        return <CollaboratorTasksCard key={cardType} onRemove={onRemove} />;
      case "time-logs":
        return <TimeLogsCard key={cardType} onRemove={onRemove} />;
      case "notes":
        return <NotesCard key={cardType} onRemove={onRemove} />;
      case "recent-tasks":
        return <RecentTasksCard key={cardType} onRemove={onRemove} />;
      case "notifications":
        return <NotificationsCard key={cardType} onRemove={onRemove} />;
      default:
        return null;
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      case "todo":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedUserName = selectedUserId === "me" 
    ? "My" 
    : users.find(u => u.id === selectedUserId)?.name || "User";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Home</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {currentUser?.name}!
          </p>
        </div>
        <CardSelector 
          selectedCards={selectedCards} 
          onCardToggle={handleCardToggle} 
        />
      </div>

      {/* User Filter for Admin/Manager */}
      {isAdminOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>View Data For</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Myself</SelectItem>
                {users.filter(user => user.id !== currentUser?.id).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Tasks Due Today - Always show section */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Calendar className="h-5 w-5" />
            Tasks Due Today ({tasksDueToday.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksDueToday.length > 0 ? (
            <div className="space-y-3">
              {tasksDueToday.map((task) => (
                <div 
                  key={task.id}
                  className="p-3 bg-white rounded-md border border-orange-200 cursor-pointer hover:bg-orange-25"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              No tasks due today
            </p>
          )}
        </CardContent>
      </Card>

      {/* High Risk Overdue Items - Always show section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            High Risk Overdue Tasks ({overdueHighRiskTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueHighRiskTasks.length > 0 ? (
            <div className="space-y-3">
              {overdueHighRiskTasks.map((task) => (
                <div 
                  key={task.id}
                  className="p-3 bg-white rounded-md border border-red-200 cursor-pointer hover:bg-red-25"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Due: {task.dueDate && format(parseISO(task.dueDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Overdue
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              No high-risk overdue tasks
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Cards */}
      {selectedCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedCards.map(renderCard)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedUserName} Tasks ({activeTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTasks.length > 0 ? (
              <TaskList tasks={activeTasks} />
            ) : (
              <p className="text-center py-6 text-muted-foreground">
                No active tasks found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Projects by Due Date */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedUserName} Projects ({projectsSortedByDueDate.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsSortedByDueDate.length > 0 ? (
              <div className="space-y-3">
                {projectsSortedByDueDate.map((project) => (
                  <div key={project.id} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{project.name}</h4>
                      <Badge className={getProjectStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {project.dueDate && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {format(parseISO(project.dueDate), "MMM dd, yyyy")}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {project.usedHours}/{project.allocatedHours || 0}h
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