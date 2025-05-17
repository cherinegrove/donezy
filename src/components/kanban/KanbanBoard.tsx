import { Task, TaskStatus } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useState } from "react";
import { EditTaskDialog } from "../tasks/EditTaskDialog";
import { GanttChart } from "./GanttChart";

type ViewMode = "list" | "gantt" | "kanban";

interface KanbanBoardProps {
  tasks?: Task[];
  projectId?: string;
  viewMode?: ViewMode;
  displayMode?: "standard" | "compact" | "detailed";
}

export function KanbanBoard({ tasks: propTasks, projectId, viewMode = "kanban", displayMode = "standard" }: KanbanBoardProps) {
  const { moveTask, tasks: allTasks } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [columnColors, setColumnColors] = useState<Record<TaskStatus, string>>({
    backlog: "#F3F4F6",
    todo: "#DBEAFE",
    "in-progress": "#FEF3C7",
    review: "#FCE7F3",
    done: "#DCFCE7"
  });
  
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

  // Render different views based on displayMode
  const renderTaskCard = (task: Task) => {
    return (
      <div
        key={task.id}
        draggable
        onDragStart={() => handleDragStart(task)}
        className={displayMode === "compact" ? "mb-2" : ""}
      >
        <TaskCard 
          task={task} 
          onClick={() => handleTaskClick(task)}
          variant={displayMode}
        />
      </div>
    );
  };
  
  // Render list view
  if (viewMode === "list") {
    return (
      <div className="w-full">
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="cursor-pointer">
              <TaskCard 
                task={task} 
                onClick={() => handleTaskClick(task)}
                variant={displayMode}
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
        </div>
      </div>
    );
  }
  
  // Render Gantt view
  if (viewMode === "gantt") {
    return (
      <div className="w-full">
        <GanttChart tasks={tasks} />
        
        {selectedTask && (
          <EditTaskDialog
            task={selectedTask}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
        )}
      </div>
    );
  }
  
  // Default: Render Kanban view
  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex min-w-[800px] gap-4 ${displayMode === "compact" ? "gap-2" : "gap-4"}`}>
        {columns.map((column) => (
          <div
            key={column.id}
            className={`flex-1 ${displayMode === "compact" ? "min-w-[200px]" : "min-w-[250px]"}`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div 
              className={`rounded-lg p-3 h-full ${displayMode === "compact" ? "p-2" : "p-3"}`}
              style={{ backgroundColor: columnColors[column.id] }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">{column.title}</h3>
                <span className="text-xs bg-background/40 px-2 py-1 rounded-full">
                  {tasksByStatus[column.id].length}
                </span>
              </div>
              
              <div className={`space-y-3 min-h-[500px] ${displayMode === "compact" ? "space-y-2 min-h-[400px]" : "space-y-3 min-h-[500px]"}`}>
                {tasksByStatus[column.id].map(renderTaskCard)}
                
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
    </div>
  );
}
