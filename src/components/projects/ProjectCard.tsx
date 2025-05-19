
import { Project } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectWatchButton } from "./ProjectWatchButton";

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { clients } = useAppContext();
  
  const client = clients.find(c => c.id === project.clientId);
  
  const getStatusBadgeClass = () => {
    switch (project.status) {
      case 'todo':
        return "bg-blue-100 text-blue-800";
      case 'in-progress':
        return "bg-amber-100 text-amber-800";
      case 'done':
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div 
      className="border rounded-md p-4 bg-card shadow-sm hover:shadow transition-all cursor-pointer relative group"
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <ProjectWatchButton project={project} variant="ghost" size="icon" />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-base line-clamp-2 pr-16">{project.name}</h3>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={getStatusBadgeClass()}>
            {project.status.replace(/-/g, ' ')}
          </Badge>
          
          {client && (
            <Badge variant="secondary">
              {client.name}
            </Badge>
          )}
          
          <Badge variant="outline">
            {project.serviceType}
          </Badge>
        </div>
        
        <div className="flex justify-between items-end">
          <div className="text-sm text-muted-foreground">
            {project.allocatedHours && (
              <span>{project.usedHours} / {project.allocatedHours} hrs</span>
            )}
          </div>
          
          {project.dueDate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(project.dueDate), "MMM d, yyyy")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
