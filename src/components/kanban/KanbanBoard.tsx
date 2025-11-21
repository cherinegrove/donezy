import { Task, TaskStatus } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useState, useEffect } from "react";
import { EditTaskDialog } from "../tasks/EditTaskDialog";
import { Settings, Edit2, CheckSquare, Trash2, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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

interface KanbanBoardProps {
  tasks?: Task[];
  projectId?: string;
  viewMode?: ViewMode;
  onBulkEdit?: (taskIds: string[]) => void;
}

export function KanbanBoard({ tasks: propTasks, projectId, viewMode = "kanban", onBulkEdit }: KanbanBoardProps) {
  const { moveTask, reorderTasks, tasks: allTasks, deleteTask, taskStatuses } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nestedSelectedTask, setNestedSelectedTask] = useState<Task | null>(null);
  const [isNestedDialogOpen, setIsNestedDialogOpen] = useState(false);
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
  
  // If tasks were passed in as props, use those
  // Otherwise, if projectId was provided, filter all tasks for that project
  // If neither, use all tasks
  const tasks = propTasks 
    ? propTasks 
    : projectId
    ? allTasks.filter(task => task.projectId === projectId)
    : allTasks;
  
  const columns: { id: TaskStatus; title: string }[] = taskStatuses
    .sort((a, b) => a.order - b.order)
    .map(status => ({
      id: status.value as TaskStatus,
      title: status.label
    }));
  
  // Prepare tasks by status and sort by order_index
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = tasks
      .filter(task => task.status === column.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    return acc;
  }, {} as Record<TaskStatus, Task[]>);
  
  // Drag and drop handler using @hello-pangea/dnd
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Dropped outside any droppable area
    if (!destination) return;
    
    // Same position, no change
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    const sourceStatus = source.droppableId as TaskStatus;
    const destinationStatus = destination.droppableId as TaskStatus;
    
    // Reorder task
    if (reorderTasks) {
      await reorderTasks(
        draggableId,
        destination.index,
        sourceStatus !== destinationStatus ? destinationStatus : undefined
      );
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
  
  // Render list view with drag-and-drop
  if (viewMode === "list") {
    // Sort tasks by order_index
    const sortedTasks = [...tasks].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    return (
      <div className="w-full">
        {renderToolbar()}
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="list-view">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {sortedTasks.map((task, index) => (
                  <Draggable 
                    key={task.id} 
                    draggableId={task.id} 
                    index={index}
                    isDragDisabled={selectedTaskIds.length > 0}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group ${snapshot.isDragging ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            {...provided.dragHandleProps}
                            className="cursor-move p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <TaskCard 
                              task={task} 
                              onClick={(e) => handleTaskClick(task, e)}
                              displayOptions={displayOptions}
                              isSelected={selectedTaskIds.includes(task.id)}
                              onSelectionChange={handleTaskSelection}
                              showSelection={true}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {sortedTasks.length === 0 && (
                  <div className="border-2 border-dashed border-muted rounded-md p-8 flex items-center justify-center bg-background/40">
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                  </div>
                )}
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
  
  // Default: Render Kanban view with drag-and-drop
  return (
    <div className="w-full">
      {renderToolbar()}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-[250px] max-w-[250px]"
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
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[400px] max-h-[70vh] overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? 'bg-background/10 rounded-md' : ''
                        }`}
                      >
                        {tasksByStatus[column.id].map((task, index) => (
                          <Draggable 
                            key={task.id} 
                            draggableId={task.id} 
                            index={index}
                            isDragDisabled={selectedTaskIds.length > 0}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group ${snapshot.isDragging ? 'opacity-50' : ''}`}
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {tasksByStatus[column.id].length === 0 && (
                          <div className="border-2 border-dashed border-muted rounded-md h-20 flex items-center justify-center bg-background/40">
                            <p className="text-sm text-muted-foreground">Drop tasks here</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
      
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
