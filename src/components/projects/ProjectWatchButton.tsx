
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
import { Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectWatchButtonProps {
  project: Project;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ProjectWatchButton = ({ project, variant = "outline", size = "icon" }: ProjectWatchButtonProps) => {
  const { currentUser, watchProject, unwatchProject } = useAppContext();
  
  if (!currentUser) return null;
  
  const isWatching = project.watcherIds?.includes(currentUser.auth_user_id) || false;
  
  const handleToggleWatch = () => {
    if (isWatching) {
      unwatchProject(project.id, currentUser.auth_user_id);
    } else {
      watchProject(project.id, currentUser.auth_user_id);
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
          {isWatching ? "Stop watching this project" : "Watch this project for updates"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
