
import React, { useState, Suspense, lazy } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Link, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EditTaskDialog = lazy(() => import("./EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskCard } from "./TaskCard";

interface RelatedTasksSectionProps {
  taskId: string;
}

export function RelatedTasksSection({ taskId }: RelatedTasksSectionProps) {
  const { tasks, projects, linkTasks, unlinkTasks } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Add null check for tasks
  const currentTask = tasks && Array.isArray(tasks) ? tasks.find(t => t && t.id === taskId) : null;
  
  // Fallback if task not found
  if (!currentTask) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Task not found
      </div>
    );
  }
  
  // Get related tasks
  const relatedTaskIds = currentTask.relatedTaskIds || [];
  const relatedTasks = tasks.filter(t => relatedTaskIds.includes(t.id));
  
  // Available tasks for linking (excluding current task and already linked tasks)
  const availableTasks = tasks.filter(t => 
    t.id !== taskId && 
    !relatedTaskIds.includes(t.id)
  );
  
  const handleLinkTask = () => {
    if (!selectedTaskId) return;
    
    try {
      linkTasks(taskId, selectedTaskId);
      setIsDialogOpen(false);
      setSelectedTaskId("");
      toast({
        title: "Tasks linked",
        description: "Tasks were linked successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to link tasks",
        description: "There was an error linking the tasks. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUnlinkTask = (relatedTaskId: string) => {
    try {
      unlinkTasks(taskId, relatedTaskId);
      toast({
        title: "Tasks unlinked",
        description: "Tasks were unlinked successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to unlink tasks",
        description: "There was an error unlinking the tasks. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Related Tasks</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Link className="h-4 w-4 mr-2" />
              Link Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Task</DialogTitle>
              <DialogDescription>
                Select a task to link to "{currentTask.title}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title} {project && `(${project.name})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLinkTask}
                disabled={!selectedTaskId}
              >
                Link Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {relatedTasks.length > 0 ? (
        <div className="space-y-2">
          {relatedTasks.map(task => (
            <div key={task.id} className="relative">
              <TaskCard 
                task={task} 
                displayOptions={["project", "assignee", "status"]}
                onClick={() => {
                  setEditingTask(task);
                  setIsEditDialogOpen(true);
                }}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlinkTask(task.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No related tasks
        </div>
      )}
      
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
