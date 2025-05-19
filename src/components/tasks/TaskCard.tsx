
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type DisplayOption = "project" | "client" | "assignee" | "parentTask" | "dueDate" | "priority" | "status" | "collaborators";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  displayOptions?: DisplayOption[];
}

export function TaskCard({ task, onClick, displayOptions = ["project", "client", "assignee", "parentTask"] }: TaskCardProps) {
  const { projects, users, tasks } = useAppContext();
  
  const project = projects.find(p => p.id === task.projectId);
  const assignee = task.assigneeId ? users.find(user => user.id === task.assigneeId) : null;
  const collaborators = users.filter(user => task.collaboratorIds?.includes(user.id));
  
  // Fix: Get parent task properly
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  
  const client = project ? projects.find(p => p.id === task.projectId)?.clientId : null;
  const clientName = client ? useAppContext().clients.find(c => c.id === client)?.name : null;
  
  const getBadgeColor = () => {
    switch (task.priority) {
      case 'high':
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case 'medium':
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case 'low':
        return "bg-primary/10 text-primary hover:bg-primary/20";
      default:
        return "";
    }
  };
  
  const getStatusColor = () => {
    switch (task.status) {
      case 'done':
        return "bg-green-100 text-green-800";
      case 'in-progress':
        return "bg-blue-100 text-blue-800";
      case 'review':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div 
      className="border rounded-md p-4 bg-card shadow-sm hover:shadow transition-all cursor-pointer relative group"
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-base line-clamp-2">{task.title}</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {displayOptions.includes("priority") && (
            <Badge variant="outline" className={getBadgeColor()}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          )}
          
          {displayOptions.includes("status") && (
            <Badge variant="outline" className={getStatusColor()}>
              {task.status.replace(/-/g, ' ')}
            </Badge>
          )}
          
          {displayOptions.includes("project") && project && (
            <Badge variant="secondary">
              {project.name}
            </Badge>
          )}

          {displayOptions.includes("client") && clientName && (
            <Badge variant="outline" className="bg-blue-50 text-blue-800">
              {clientName}
            </Badge>
          )}

          {displayOptions.includes("parentTask") && parentTask && (
            <Badge variant="outline" className="bg-purple-50 text-purple-800">
              Parent: {parentTask.title && parentTask.title.length > 15 ? `${parentTask.title.substring(0, 15)}...` : parentTask.title}
            </Badge>
          )}
        </div>
        
        <div className="flex justify-between items-end">
          {displayOptions.includes("assignee") && assignee && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Assignee:</span>
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback>{assignee.name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </div>
          )}
          
          {displayOptions.includes("collaborators") && collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Collaborators:</span>
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map(user => (
                  <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                ))}
                {collaborators.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {displayOptions.includes("dueDate") && task.dueDate && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(task.dueDate), "MMM d")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
