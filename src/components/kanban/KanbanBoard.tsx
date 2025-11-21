import { Task, TaskStatus } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { TaskCardSkeleton } from "./TaskCardSkeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings, Edit2, CheckSquare, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type ViewMode = "list" | "kanban";
type DisplayOption = "project" | "client" | "assignee" | "dueDate" | "priority" | "status" | "collaborators";

// Lazy load the edit dialog for better performance
const EditTaskDialog = lazy(() => import("../tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));

interface KanbanBoardProps {
  tasks?: Task[];
  projectId?: string;
  viewMode?: ViewMode;
  onBulkEdit?: (taskIds: string[]) => void;
}

export function KanbanBoard({ tasks: propTasks, projectId, viewMode = "kanban", onBulkEdit }: KanbanBoardProps) {
  const { moveTask, tasks: allTasks, deleteTask, taskStatuses } = useAppContext();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nestedSelectedTask, setNestedSelectedTask] = useState<Task | null>(null);
  const [isNestedDialogOpen, setIsNestedDialogOpen] = useState(false);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const [columnColors, setColumnColors] = useState<Record<TaskStatus, string>>({
    backlog: "var(--kanban-backlog)",
    todo: "var(--kanban-todo)",
    "in-progress": "var(--kanban-in-progress)",
    review: "var(--kanban-review)",
    done: "var(--kanban-done)"
  });

  // Load saved kanban colors on mount and listen for changes
  useEffect(() => {
    const loadColors = () => {
      const savedColors = localStorage.getItem('kanbanColors');
      if (savedColors) {
        try {
          const parsedColors = JSON.parse(savedColors);
          const colorMap: Record<TaskStatus, string> = {
            backlog: "var(--kanban-backlog)",
            todo: "var(--kanban-todo)",
            "in-progress": "var(--kanban-in-progress)",
            review: "var(--kanban-review)",
            done: "var(--kanban-done)"
          };
          
          // Update colorMap with saved colors
          parsedColors.forEach((color: { name: string; value: string }) => {
            if (color.name in colorMap) {
              colorMap[color.name as TaskStatus] = color.value;
            }
          });
          
          setColumnColors(colorMap);
        } catch (e) {
          console.error('Error parsing kanban colors from localStorage', e);
        }
      }
    };

    // Load colors initially
    loadColors();

    // Listen for storage changes (when colors are saved from settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kanbanColors') {
        loadColors();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event (for same-tab updates)
    const handleColorsUpdate = () => {
      loadColors();
    };

    window.addEventListener('kanbanColorsUpdated', handleColorsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('kanbanColorsUpdated', handleColorsUpdate);
    };
  }, []);
  
  // Task selection functionality
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  // Global display options for all task cards - load from localStorage
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>(() => {
    const saved = localStorage.getItem('kanban-display-options');
    return saved ? JSON.parse(saved) : ["project", "client", "assignee"];
  });
  
  // Sync optimistic tasks with real tasks
  useEffect(() => {
    const baseTasks = propTasks 
      ? propTasks 
      : projectId
      ? allTasks.filter(task => task.projectId === projectId)
      : allTasks;
    setOptimisticTasks(baseTasks);
  }, [propTasks, allTasks, projectId]);

  // Use optimistic tasks for display
  const tasks = optimisticTasks;
  
  // Memoize columns to prevent unnecessary recalculations
  const columns = useMemo(() => 
    taskStatuses
      .sort((a, b) => a.order - b.order)
      .map(status => ({
        id: status.value as TaskStatus,
        title: status.label
      })),
    [taskStatuses]
  );
  
  // Memoize tasks by status for performance
  const tasksByStatus = useMemo(() => 
    columns.reduce((acc, column) => {
      acc[column.id] = tasks.filter(task => task.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, Task[]>),
    [tasks, columns]
  );
  
  // Drag and drop handlers
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', task.id);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask) return;
    
    const taskId = draggedTask.id;
    const oldStatus = draggedTask.status;
    
    // Optimistic update - immediately update UI
    setOptimisticTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, status } : t)
    );
    setDraggedTask(null);
    
    // Perform actual update in background
    try {
      await moveTask(taskId, status);
    } catch (error) {
      // Revert on error
      console.error('Failed to move task:', error);
      setOptimisticTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t)
      );
      toast({
        title: "Failed to move task",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  
  const handleTaskClick = (task: Task, event?: React.MouseEvent) => {
    // If Ctrl/Cmd key is pressed or there are already selected tasks, toggle selection
    if (event?.ctrlKey || event?.metaKey || selectedTaskIds.length > 0) {
      handleTaskSelection(task.id);
    } else {
      // Normal single task edit
      setSelectedTask(task);
      setIsEditDialogOpen(true);
    }
  };

  const handleNestedTaskClick = (task: Task) => {
    setNestedSelectedTask(task);
    setIsNestedDialogOpen(true);
  };

  // Task selection functions
  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(task => task.id));
    }
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  const handleEdit = () => {
    if (selectedTaskIds.length === 1) {
      // Single task edit
      const task = tasks.find(t => t.id === selectedTaskIds[0]);
      if (task) {
        setSelectedTask(task);
        setIsEditDialogOpen(true);
        clearSelection();
      }
    } else if (selectedTaskIds.length > 1) {
      // Bulk edit
      if (onBulkEdit) {
        onBulkEdit(selectedTaskIds);
        clearSelection();
      }
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedTaskIds.length} task${selectedTaskIds.length > 1 ? 's' : ''}?`)) {
      selectedTaskIds.forEach(taskId => {
        deleteTask(taskId);
      });
      clearSelection();
    }
  };

  // Toggle display option for all cards
  const toggleDisplayOption = (option: DisplayOption) => {
    const newOptions = displayOptions.includes(option) 
      ? displayOptions.filter(opt => opt !== option)
      : [...displayOptions, option];
    
    setDisplayOptions(newOptions);
    localStorage.setItem('kanban-display-options', JSON.stringify(newOptions));
  };

  // Render toolbar with selection controls and display options
  const renderToolbar = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {selectedTaskIds.length > 0 && (
            <>
              <Badge variant="secondary">
                {selectedTaskIds.length} selected
              </Badge>
              <Button
                size="sm"
                onClick={handleEdit}
                className="h-9"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {selectedTaskIds.length === 1 ? "Edit Task" : "Edit Selected"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="h-9"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-9"
              >
                {selectedTaskIds.length === tasks.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-9"
              >
                Clear
              </Button>
            </>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Settings className="h-4 w-4 mr-2" />
                    Display Options
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
    );
  };
  
  // Render list view
  if (viewMode === "list") {
    return (
      <div className="w-full">
        {renderToolbar()}
        
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div key={task.id} className="group animate-fade-in" style={{ animationDelay: `${index * 0.02}s` }}>
              <TaskCard 
                task={task} 
                onClick={(e) => handleTaskClick(task, e)}
                displayOptions={displayOptions}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelectionChange={handleTaskSelection}
                showSelection={true}
              />
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="border-2 border-dashed border-muted rounded-md p-8 flex items-center justify-center bg-background/40">
              <p className="text-sm text-muted-foreground">No tasks found</p>
            </div>
          )}
          
      {selectedTask && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />}>
          <EditTaskDialog
            task={selectedTask}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
        </Suspense>
      )}
      
      {nestedSelectedTask && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />}>
          <EditTaskDialog
            task={nestedSelectedTask}
            open={isNestedDialogOpen}
            onOpenChange={setIsNestedDialogOpen}
          />
        </Suspense>
      )}
        </div>
      </div>
    );
  }
  
  // Default: Render Kanban view
  return (
    <div className="w-full">
      {renderToolbar()}
      
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-1 min-w-[250px] max-w-[250px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div 
                className="rounded-lg p-3 h-full"
                style={{ backgroundImage: columnColors[column.id] }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-sm">{column.title}</h3>
                  <span className="text-xs bg-background/40 px-2 py-1 rounded-full">
                    {tasksByStatus[column.id].length}
                  </span>
                </div>
                
                <div className="space-y-2 min-h-[400px]">
                  {tasksByStatus[column.id].map((task, index) => (
                    <div
                      key={task.id}
                      className="group animate-fade-in drag-transition"
                      style={{ animationDelay: `${index * 0.03}s` }}
                      draggable={selectedTaskIds.length === 0}
                      onDragStart={(e) => selectedTaskIds.length === 0 && handleDragStart(e, task)}
                    >
                      <TaskCard 
                        task={task} 
                        onClick={(e) => handleTaskClick(task, e)}
                        displayOptions={displayOptions}
                        isSelected={selectedTaskIds.includes(task.id)}
                        onSelectionChange={handleTaskSelection}
                        showSelection={true}
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
