
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { Task } from "@/types";
import { Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskWatchButtonProps {
  task: Task;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const TaskWatchButton = ({ task, variant = "outline", size = "icon" }: TaskWatchButtonProps) => {
  const { currentUser, watchTask, unwatchTask } = useAppContext();
  
  if (!currentUser) return null;
  
  const isWatching = task.watcherIds?.includes(currentUser.auth_user_id) || false;
  
  const handleToggleWatch = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling when used in cards
    }
    
    if (isWatching) {
      unwatchTask(task.id, currentUser.auth_user_id);
    } else {
      watchTask(task.id, currentUser.auth_user_id);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            onClick={handleToggleWatch}
            className={isWatching ? "text-primary" : "text-muted-foreground"}
          >
            {isWatching ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isWatching ? "Stop watching this task" : "Watch this task for updates"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
