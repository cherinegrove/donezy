import { useState, useEffect } from "react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, User, GripVertical } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task, Project } from "@/types";
import { CardSelector, CardType } from "@/components/dashboard/CardSelector";
import { CollaboratorTasksCard } from "@/components/dashboard/cards/CollaboratorTasksCard";
import { TimeLogsCard } from "@/components/dashboard/cards/TimeLogsCard";
import { NotesCard } from "@/components/dashboard/cards/NotesCard";
import { RecentTasksCard } from "@/components/dashboard/cards/RecentTasksCard";
import { NotificationsCard } from "@/components/dashboard/cards/NotificationsCard";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const Home = () => {
  const { tasks, projects, users, currentUser } = useAppContext();
  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<CardType[]>(["time-logs", "notes"]);
  
  // Dashboard section ordering
  type DashboardSection = 
    | "user-filter"
    | "tasks-due-today" 
    | "overdue-tasks"
    | "main-content"
    | CardType;
     
  const [sectionOrder, setSectionOrder] = useState<DashboardSection[]>([
    "user-filter",
    "tasks-due-today",
    "overdue-tasks", 
    "time-logs",
    "notes",
    "main-content"
  ]);

  // Load saved order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('dashboard-section-order');
    if (savedOrder) {
      try {
        setSectionOrder(JSON.parse(savedOrder));
      } catch (error) {
        console.error('Failed to parse saved section order:', error);
      }
    }
  }, []);

  // Save order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboard-section-order', JSON.stringify(sectionOrder));
  }, [sectionOrder]);

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
    setSectionOrder(prev => {
      if (prev.includes(cardId)) {
        // Remove the card
        return prev.filter(id => id !== cardId);
      } else {
        // Add the card before main-content
        const mainContentIndex = prev.indexOf("main-content");
        const newOrder = [...prev];
        newOrder.splice(mainContentIndex, 0, cardId);
        return newOrder;
      }
    });
  };

  const renderCard = (cardType: CardType) => {
    const onRemove = () => handleCardToggle(cardType);
    
    switch (cardType) {
      case "collaborator-tasks":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Collaborator Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CollaboratorTasksCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
      case "time-logs":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Time Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeLogsCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
      case "notes":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
      case "recent-tasks":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentTasksCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
      case "notifications":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationsCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
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

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSectionOrder(items);
  };

  const selectedUserName = selectedUserId === "me" 
    ? "My" 
    : users.find(u => u.id === selectedUserId)?.name || "User";

  // Render individual sections
  const renderSection = (sectionId: DashboardSection, index: number) => {
    const content = (() => {
      switch (sectionId) {
        case "user-filter":
          return isAdminOrManager ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  View Data For
                </CardTitle>
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
          ) : null;

        case "tasks-due-today":
          return (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
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
          );

        case "overdue-tasks":
          return (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
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
          );

        case "collaborator-tasks":
        case "time-logs":
        case "notes":
        case "recent-tasks":
        case "notifications":
          return renderCard(sectionId as CardType);

        case "main-content":
          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  Tasks & Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          );

        default:
          return null;
      }
    })();

    if (!content) return null;

    // Make user-filter section non-draggable
    if (sectionId === "user-filter") {
      return (
        <div key={sectionId}>
          {content}
        </div>
      );
    }

    return (
      <Draggable key={sectionId} draggableId={sectionId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`transition-all duration-200 ${
              snapshot.isDragging ? 'opacity-50 rotate-2 scale-105' : 'opacity-100'
            }`}
          >
            {content}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Home</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {currentUser?.name}! Drag the grip icons to reorder sections.
          </p>
        </div>
        <CardSelector 
          selectedCards={sectionOrder.filter(section => 
            ["collaborator-tasks", "time-logs", "notes", "recent-tasks", "notifications"].includes(section)
          ) as CardType[]} 
          onCardToggle={handleCardToggle} 
        />
      </div>

      {/* Drag and Drop Dashboard */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-sections">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-6 transition-colors duration-200 rounded-lg p-2 ${
                snapshot.isDraggingOver ? 'bg-muted/50' : ''
              }`}
            >
              {sectionOrder.map((sectionId, index) => renderSection(sectionId, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

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