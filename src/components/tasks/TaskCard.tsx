
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
  onClick?: (e?: React.MouseEvent) => void;
  showProject?: boolean;
  displayOptions?: string[];
  isSelected?: boolean;
  onSelectionChange?: (taskId: string) => void;
  showSelection?: boolean;
}

export function TaskCard({ task, onClick, showProject = true, displayOptions = [], isSelected = false, onSelectionChange, showSelection = false }: TaskCardProps) {
  const { projects, users, currentUser, clients } = useAppContext();
  
  const project = projects.find(p => p.id === task.projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;
  
  // Handle both UUID and name-based assignee IDs for backward compatibility
  const assignee = task.assigneeId ? (
    users.find(u => u.id === task.assigneeId) || 
    users.find(u => u.name === task.assigneeId) ||
    users.find(u => u.name.toLowerCase().includes(task.assigneeId.toLowerCase()))
  ) : null;
                   
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
    e.preventDefault();
    if (onSelectionChange) {
      onSelectionChange(task.id);
    }
  };

  const handleSelectionChange = (checked: boolean | string) => {
    if (onSelectionChange) {
      onSelectionChange(task.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if checkbox area was clicked
    const target = e.target as HTMLElement;
    if (target.closest('[data-checkbox]')) {
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group relative border-none shadow-sm",
        isCollaboratorTask && "border-l-4 border-l-blue-500",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={handleCardClick}
    >
      {showSelection && (
        <div className="absolute top-2 right-2 z-10" data-checkbox>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectionChange}
            onClick={handleSelectionClick}
            className={cn(
              "transition-opacity bg-background border-2 shadow-sm",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />
        </div>
      )}
      <CardContent className={cn("p-5", showSelection && "pr-10")}>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm line-clamp-2">
              {task.title}
              {isCollaboratorTask && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Collaborator
                </Badge>
              )}
            </h3>
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}
          
          <div className="space-y-2">
            {displayOptions.includes("priority") && (
              <div className="flex items-center">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getPriorityColor(task.priority))}
                >
                  {task.priority}
                </Badge>
              </div>
            )}
            
            {displayOptions.includes("status") && (
              <div className="flex items-center">
                <Badge variant="outline" className="text-xs">
                  {task.status.replace('-', ' ')}
                </Badge>
              </div>
            )}
            
            {displayOptions.includes("project") && showProject && project && (
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="truncate">{project.name}</span>
              </div>
            )}
            
            {displayOptions.includes("client") && client && (
              <div className="flex items-center text-xs">
                <span className="truncate text-blue-600">{client.name}</span>
              </div>
            )}
            
            {displayOptions.includes("assignee") && (
              <div className="flex items-center gap-2 text-xs">
                {assignee ? (
                  <>
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={assignee.avatar} alt={assignee.name} />
                      <AvatarFallback className="text-xs">
                        {assignee.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-muted-foreground">{assignee.name}</span>
                  </>
                ) : (
                  <span className="truncate text-muted-foreground italic">Unassigned</span>
                )}
              </div>
            )}
            
            {displayOptions.includes("collaborators") && collaborators.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex -space-x-1">
                  {collaborators.slice(0, 3).map((collaborator, index) => (
                    <Avatar key={collaborator.id} className="h-4 w-4 border-2 border-blue-200">
                      <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                      <AvatarFallback className="text-xs bg-blue-100">
                        {collaborator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {collaborators.length > 3 && (
                  <span className="text-xs text-blue-600">+{collaborators.length - 3}</span>
                )}
                <span className="text-xs text-muted-foreground">Collaborators</span>
              </div>
            )}
            
            {displayOptions.includes("dueDate") && task.dueDate && (
              <div className="flex items-center text-xs">
                <span className={cn(
                  isOverdue(task.dueDate) ? "text-red-500" : "text-muted-foreground"
                )}>
                  Due: {formatDueDate(task.dueDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
