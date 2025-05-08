
import { Task, TaskStatus } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { TaskCard } from "../tasks/TaskCard";
import { useState, useEffect } from "react";
import { EditTaskDialog } from "../tasks/EditTaskDialog";

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { getTasksByProject, moveTask } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [columnColors, setColumnColors] = useState<Record<TaskStatus, string>>({
    backlog: "#F3F4F6",
    todo: "#DBEAFE",
    "in-progress": "#FEF3C7",
    review: "#FCE7F3",
    done: "#DCFCE7"
  });
  
  const projectTasks = getTasksByProject(projectId);
  
  const columns: { id: TaskStatus; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done" },
  ];
  
  // Load column colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('kanbanColors');
    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        const colorMap: Record<TaskStatus, string> = {} as Record<TaskStatus, string>;
        
        parsedColors.forEach((color: { name: TaskStatus; value: string }) => {
          colorMap[color.name] = color.value;
        });
        
        setColumnColors(colorMap);
      } catch (e) {
        console.error('Error parsing kanban colors from localStorage', e);
      }
    }
  }, []);
  
  // Prepare tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = projectTasks.filter(task => task.status === column.id);
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
  
  return (
    <div className="w-full overflow-x-auto">
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
                {tasksByStatus[column.id].map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                  >
                    <TaskCard 
                      task={task} 
                      onClick={() => handleTaskClick(task)}
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
    </div>
  );
}
