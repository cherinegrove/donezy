import { Task, TaskStatus } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useState } from "react";
import { EditTaskDialog } from "../tasks/EditTaskDialog";
import { GanttChart } from "./GanttChart";
import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = "list" | "gantt" | "kanban";
type DisplayOption = "project" | "client" | "assignee" | "parentTask" | "dueDate" | "priority" | "status" | "collaborators";

interface KanbanBoardProps {
  tasks?: Task[];
  projectId?: string;
  viewMode?: ViewMode;
}

export function KanbanBoard({ tasks: propTasks, projectId, viewMode = "kanban" }: KanbanBoardProps) {
  const { moveTask, tasks: allTasks } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nestedSelectedTask, setNestedSelectedTask] = useState<Task | null>(null);
  const [isNestedDialogOpen, setIsNestedDialogOpen] = useState(false);
  const [columnColors, setColumnColors] = useState<Record<TaskStatus, string>>({
    backlog: "#F3F4F6",
    todo: "#DBEAFE",
    "in-progress": "#FEF3C7",
    review: "#FCE7F3",
    done: "#DCFCE7"
  });
  
  // Global display options for all task cards
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([
    "project", "client", "assignee", "parentTask"
  ]);
  
  // If tasks were passed in as props, use those
  // Otherwise, if projectId was provided, filter all tasks for that project
  // If neither, use all tasks
  const tasks = propTasks 
    ? propTasks 
    : projectId
    ? allTasks.filter(task => task.projectId === projectId)
    : allTasks;
  
  const columns: { id: TaskStatus; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done" },
  ];
  
  // Prepare tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);
  
  // Drag and drop handlers
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (status: TaskStatus) => {
    if (draggedTask) {
      moveTask(draggedTask.id, status);
      setDraggedTask(null);
    }
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleNestedTaskClick = (task: Task) => {
    setNestedSelectedTask(task);
    setIsNestedDialogOpen(true);
  };

  // Toggle display option for all cards
  const toggleDisplayOption = (option: DisplayOption) => {
    if (displayOptions.includes(option)) {
      setDisplayOptions(displayOptions.filter(opt => opt !== option));
    } else {
      setDisplayOptions([...displayOptions, option]);
    }
  };
  
  // Render list view
  if (viewMode === "list") {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Settings className="h-4 w-4 mr-2" />
                      Card Display Options
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("project")}
                      onCheckedChange={() => toggleDisplayOption("project")}
                    >
                      Project
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("client")}
                      onCheckedChange={() => toggleDisplayOption("client")}
                    >
                      Client
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("assignee")}
                      onCheckedChange={() => toggleDisplayOption("assignee")}
                    >
                      Assignee
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("collaborators")}
                      onCheckedChange={() => toggleDisplayOption("collaborators")}
                    >
                      Collaborators
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("parentTask")}
                      onCheckedChange={() => toggleDisplayOption("parentTask")}
                    >
                      Parent Task
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("dueDate")}
                      onCheckedChange={() => toggleDisplayOption("dueDate")}
                    >
                      Due Date
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("priority")}
                      onCheckedChange={() => toggleDisplayOption("priority")}
                    >
                      Priority
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("status")}
                      onCheckedChange={() => toggleDisplayOption("status")}
                    >
                      Status
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                Configure what information is displayed on task cards
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="cursor-pointer">
              <TaskCard 
                task={task} 
                onClick={() => handleTaskClick(task)}
                displayOptions={displayOptions}
              />
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="border-2 border-dashed border-muted rounded-md p-8 flex items-center justify-center bg-background/40">
              <p className="text-sm text-muted-foreground">No tasks found</p>
            </div>
          )}
          
          {selectedTask && (
            <EditTaskDialog
              task={selectedTask}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
            />
          )}
          
          {nestedSelectedTask && (
            <EditTaskDialog
              task={nestedSelectedTask}
              open={isNestedDialogOpen}
              onOpenChange={setIsNestedDialogOpen}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Render Gantt view
  if (viewMode === "gantt") {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Settings className="h-4 w-4 mr-2" />
                      Card Display Options
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("project")}
                      onCheckedChange={() => toggleDisplayOption("project")}
                    >
                      Project
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("client")}
                      onCheckedChange={() => toggleDisplayOption("client")}
                    >
                      Client
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("assignee")}
                      onCheckedChange={() => toggleDisplayOption("assignee")}
                    >
                      Assignee
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("collaborators")}
                      onCheckedChange={() => toggleDisplayOption("collaborators")}
                    >
                      Collaborators
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("parentTask")}
                      onCheckedChange={() => toggleDisplayOption("parentTask")}
                    >
                      Parent Task
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("dueDate")}
                      onCheckedChange={() => toggleDisplayOption("dueDate")}
                    >
                      Due Date
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("priority")}
                      onCheckedChange={() => toggleDisplayOption("priority")}
                    >
                      Priority
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={displayOptions.includes("status")}
                      onCheckedChange={() => toggleDisplayOption("status")}
                    >
                      Status
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                Configure what information is displayed on task cards
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <GanttChart tasks={tasks} />
        
        {selectedTask && (
          <EditTaskDialog
            task={selectedTask}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
        )}
        
        {nestedSelectedTask && (
          <EditTaskDialog
            task={nestedSelectedTask}
            open={isNestedDialogOpen}
            onOpenChange={setIsNestedDialogOpen}
          />
        )}
      </div>
    );
  }
  
  // Default: Render Kanban view
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex justify-end mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Settings className="h-4 w-4 mr-2" />
                    Card Display Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("project")}
                    onCheckedChange={() => toggleDisplayOption("project")}
                  >
                    Project
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("client")}
                    onCheckedChange={() => toggleDisplayOption("client")}
                  >
                    Client
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("assignee")}
                    onCheckedChange={() => toggleDisplayOption("assignee")}
                  >
                    Assignee
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("collaborators")}
                    onCheckedChange={() => toggleDisplayOption("collaborators")}
                  >
                    Collaborators
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("parentTask")}
                    onCheckedChange={() => toggleDisplayOption("parentTask")}
                  >
                    Parent Task
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("dueDate")}
                    onCheckedChange={() => toggleDisplayOption("dueDate")}
                  >
                    Due Date
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("priority")}
                    onCheckedChange={() => toggleDisplayOption("priority")}
                  >
                    Priority
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={displayOptions.includes("status")}
                    onCheckedChange={() => toggleDisplayOption("status")}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              Configure what information is displayed on task cards
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex min-w-[800px] gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex-1 min-w-[250px]"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div 
              className="rounded-lg p-3 h-full"
              style={{ backgroundColor: columnColors[column.id] }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">{column.title}</h3>
                <span className="text-xs bg-background/40 px-2 py-1 rounded-full">
                  {tasksByStatus[column.id].length}
                </span>
              </div>
              
              <div className="space-y-3 min-h-[500px]">
                {tasksByStatus[column.id].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                  >
                    <TaskCard 
                      task={task} 
                      onClick={() => handleTaskClick(task)}
                      displayOptions={displayOptions}
                    />
                  </div>
                ))}
                
                {tasksByStatus[column.id].length === 0 && (
                  <div className="border-2 border-dashed border-muted rounded-md h-20 flex items-center justify-center bg-background/40">
                    <p className="text-sm text-muted-foreground">Drop tasks here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      
      {nestedSelectedTask && (
        <EditTaskDialog
          task={nestedSelectedTask}
          open={isNestedDialogOpen}
          onOpenChange={setIsNestedDialogOpen}
        />
      )}
    </div>
  );
}
