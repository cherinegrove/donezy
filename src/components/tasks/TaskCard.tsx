
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, isBefore } from "date-fns";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showProject?: boolean;
  displayOptions?: string[];
  isSelected?: boolean;
  onSelectionChange?: (taskId: string) => void;
  showSelection?: boolean;
}

export function TaskCard({ task, onClick, showProject = true, displayOptions = [], isSelected = false, onSelectionChange, showSelection = false }: TaskCardProps) {
  const { projects, users, currentUser } = useAppContext();
  
  const project = projects.find(p => p.id === task.projectId);
  const assignee = users.find(u => u.id === task.assigneeId);
  const collaborators = (task.collaboratorIds || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatDueDate = (date: string) => {
    return format(new Date(date), "MMM dd");
  };

  const isOverdue = (date: string) => {
    return isBefore(parseISO(date), new Date());
  };

  const isCollaboratorTask = task.collaboratorIds?.includes(currentUser?.id) && task.assigneeId !== currentUser?.id;

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(task.id);
    }
  };

  const handleSelectionChange = () => {
    if (onSelectionChange) {
      onSelectionChange(task.id);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative",
        isCollaboratorTask && "border-l-4 border-l-blue-500",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      {showSelection && (
        <div className="absolute top-3 right-3 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectionChange}
            onClick={handleSelectionClick}
            className={cn(
              "transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h3 className={cn(
              "font-medium text-sm line-clamp-2 flex-1",
              showSelection && "pr-8" // Add padding when checkbox is present
            )}>
              {task.title}
              {isCollaboratorTask && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Collaborator
                </Badge>
              )}
            </h3>
            <Badge 
              variant="secondary" 
              className={cn("text-xs", getPriorityColor(task.priority))}
            >
              {task.priority}
            </Badge>
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {task.status.replace('-', ' ')}
              </Badge>
              {showProject && project && (
                <span className="truncate max-w-[100px]">{project.name}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {assignee && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className="text-xs">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate max-w-[60px]">{assignee.name}</span>
                </div>
              )}
              
              {collaborators.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {collaborators.slice(0, 2).map((collaborator, index) => (
                      <Avatar key={collaborator.id} className="h-4 w-4 border-2 border-blue-200">
                        <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                        <AvatarFallback className="text-xs bg-blue-100">
                          {collaborator.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {collaborators.length > 2 && (
                    <span className="text-xs text-blue-600">+{collaborators.length - 2}</span>
                  )}
                </div>
              )}
              
              {task.dueDate && (
                <span className={cn(
                  "text-xs",
                  isOverdue(task.dueDate) ? "text-red-500" : "text-muted-foreground"
                )}>
                  {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
