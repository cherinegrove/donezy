import { useState, useEffect } from "react";
import { format, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, GripVertical } from "lucide-react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";
import { CardSelector, CardType } from "@/components/dashboard/CardSelector";
import { CollaboratorTasksCard } from "@/components/dashboard/cards/CollaboratorTasksCard";
import { TimeLogsCard } from "@/components/dashboard/cards/TimeLogsCard";
import { RecentTasksCard } from "@/components/dashboard/cards/RecentTasksCard";
import { NotificationsCard } from "@/components/dashboard/cards/NotificationsCard";
import { TaskRemindersCard } from "@/components/dashboard/cards/TaskRemindersCard";
import { MyWeekCard } from "@/components/dashboard/cards/MyWeekCard";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const Home = () => {
  const { tasks, projects, users, currentUser, customRoles } = useAppContext();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Grid-based layout system
  type DashboardSection = 
    | "user-filter"
    | "tasks-due-today" 
    | "overdue-tasks"
    | "tasks"
    | "projects"
    | CardType;

  interface GridPosition {
    row: number;
    col: number;
    section: DashboardSection | null;
  }

  const defaultGrid: GridPosition[] = [
    { row: 0, col: 0, section: "user-filter" },
    { row: 0, col: 1, section: null },
    { row: 1, col: 0, section: "tasks-due-today" },
    { row: 1, col: 1, section: "overdue-tasks" },
    { row: 2, col: 0, section: "time-logs" },
    { row: 2, col: 1, section: null },
    { row: 3, col: 0, section: "tasks" },
    { row: 3, col: 1, section: "projects" },
  ];

  const [gridLayout, setGridLayout] = useState<GridPosition[]>(defaultGrid);

  // Load saved layout from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-grid-layout');
    if (savedLayout) {
      try {
        setGridLayout(JSON.parse(savedLayout));
      } catch (error) {
        console.error('Failed to parse saved grid layout:', error);
      }
    }
  }, []);

  // Save layout to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboard-grid-layout', JSON.stringify(gridLayout));
  }, [gridLayout]);

  const today = startOfToday();
  const isAdminOrManager = currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin';

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
        project.ownerId === currentUser?.id ||
        project.collaboratorIds?.includes(currentUser?.id) ||
        project.teamIds?.includes(currentUser?.id) ||
        project.watcherIds?.includes(currentUser?.id) ||
        tasks.some(task => 
          task.projectId === project.id && 
          (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id))
        )
      );
    }
    return projects.filter(project => 
      project.ownerId === selectedUserId ||
      project.collaboratorIds?.includes(selectedUserId) ||
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

  // Overdue high priority tasks
  const overdueHighRiskTasks = filteredTasks.filter(task => 
    task.dueDate && 
    isBefore(parseISO(task.dueDate), today) &&
    task.status !== "done" &&
    task.priority === "high"
  );

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
    setGridLayout(prev => {
      const cardExists = prev.some(cell => cell.section === cardId);
      
      if (cardExists) {
        // Remove the card from grid
        return prev.map(cell => 
          cell.section === cardId ? { ...cell, section: null } : cell
        );
      } else {
        // Add card to first empty cell
        const firstEmpty = prev.findIndex(cell => cell.section === null);
        if (firstEmpty !== -1) {
          const newLayout = [...prev];
          newLayout[firstEmpty] = { ...newLayout[firstEmpty], section: cardId };
          return newLayout;
        }
        // If no empty cells, add a new row
        const maxRow = Math.max(...prev.map(cell => cell.row));
        return [
          ...prev,
          { row: maxRow + 1, col: 0, section: cardId },
          { row: maxRow + 1, col: 1, section: null }
        ];
      }
    });
  };

  const renderCard = (cardType: CardType) => {
    const onRemove = () => handleCardToggle(cardType);
    const targetUserId = selectedUserId === "me" ? currentUser?.id : selectedUserId;
    
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
              <NotificationsCard onRemove={onRemove} userId={targetUserId} />
            </CardContent>
          </Card>
        );
      case "task-reminders":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                Task Reminders Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskRemindersCard onRemove={onRemove} />
            </CardContent>
          </Card>
        );
      case "my-week":
        return (
          <Card key={cardType}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                My Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MyWeekCard onRemove={onRemove} />
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

  // Handle drag and drop for grid layout
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.draggableId;
    const destIndex = parseInt(result.destination.droppableId.split('-')[1]);
    const sourceIndex = gridLayout.findIndex(cell => cell.section === sourceId);

    if (sourceIndex === -1) return;

    setGridLayout(prev => {
      const newLayout = [...prev];
      // Clear source position
      newLayout[sourceIndex] = { ...newLayout[sourceIndex], section: null };
      // Set destination position
      const temp = newLayout[destIndex].section;
      newLayout[destIndex] = { ...newLayout[destIndex], section: sourceId as DashboardSection };
      
      // If destination had a card, swap it to source
      if (temp) {
        newLayout[sourceIndex] = { ...newLayout[sourceIndex], section: temp };
      }
      
      return newLayout;
    });
  };

  const selectedUserName = selectedUserId === "me" 
    ? "My" 
    : users.find(u => u.id === selectedUserId)?.name || "User";

  const getActiveSections = () => {
    return gridLayout
      .map(cell => cell.section)
      .filter((s): s is CardType => 
        s !== null && 
        s !== "user-filter" && 
        s !== "tasks-due-today" && 
        s !== "overdue-tasks" && 
        s !== "tasks" && 
        s !== "projects"
      );
  };

  // Render individual sections
  const renderSection = (sectionId: DashboardSection | null, cellIndex: number) => {
    if (!sectionId) {
      // Empty cell - droppable zone
      return (
        <Droppable droppableId={`cell-${cellIndex}`} key={`cell-${cellIndex}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[200px] border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
              }`}
            >
              <p className="text-sm text-muted-foreground">Drop card here</p>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      );
    }

    const content = (() => {
      switch (sectionId) {
        case "user-filter":
          return isAdminOrManager ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
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
                    {users.filter(user => user.auth_user_id !== currentUser?.auth_user_id).map((user) => (
                      <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
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
                  <div className="space-y-2">
                    {tasksDueToday.map((task) => (
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
                  Overdue Tasks ({overdueHighRiskTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overdueHighRiskTasks.length > 0 ? (
                  <div className="space-y-2">
                    {overdueHighRiskTasks.map((task) => (
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
          );

        case "collaborator-tasks":
        case "time-logs":
        case "recent-tasks":
        case "notifications":
        case "task-reminders":
        case "my-week":
          return renderCard(sectionId as CardType);

        case "tasks":
          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  {selectedUserName} Tasks ({activeTasks.length})
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
          );

        case "projects":
          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  All Projects ({filteredProjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredProjects.length > 0 ? (
                  <div className="space-y-3">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="p-3 border rounded-md cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${project.id}`)}>
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
          );

        default:
          return null;
      }
    })();

    if (!content) {
      return (
        <Droppable droppableId={`cell-${cellIndex}`} key={`cell-${cellIndex}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[200px] border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
              }`}
            >
              <p className="text-sm text-muted-foreground">Drop card here</p>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      );
    }

    return (
      <Droppable droppableId={`cell-${cellIndex}`} key={`cell-${cellIndex}`}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <Draggable draggableId={sectionId} index={cellIndex}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={snapshot.isDragging ? 'opacity-50' : ''}
                >
                  {content}
                </div>
              )}
            </Draggable>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Home</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {currentUser?.name}! Drag cards to reposition them on the grid.
          </p>
        </div>
        <CardSelector 
          selectedCards={getActiveSections()}
          onCardToggle={handleCardToggle} 
        />
      </div>

      {/* Grid-based Dashboard */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {gridLayout.map((cell, index) => (
            <div key={`${cell.row}-${cell.col}`}>
              {renderSection(cell.section, index)}
            </div>
          ))}
        </div>
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
