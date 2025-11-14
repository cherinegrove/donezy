import React from "react";
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
    <div 
      className={cn(
        "p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all relative group bg-task-card hover:bg-task-card/80",
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
      <div className={cn(showSelection && "pr-8")}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-base line-clamp-1 flex-1">
            {task.title}
          </h4>
          {displayOptions.includes("status") && (
            <Badge variant="outline" className="ml-2">
              {task.status}
            </Badge>
          )}
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {displayOptions.includes("priority") && (
            <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
              {task.priority}
            </Badge>
          )}
          
          {displayOptions.includes("project") && project && (
            <span className="text-xs">{project.name}</span>
          )}
          
          {displayOptions.includes("client") && client && (
            <span className="text-xs text-blue-600">{client.name}</span>
          )}
          
          {displayOptions.includes("assignee") && assignee && (
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback className="text-xs">{assignee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{assignee.name}</span>
            </div>
          )}
          
          {displayOptions.includes("dueDate") && task.dueDate && (
            <span className={cn("text-xs", isOverdue(task.dueDate) && "text-red-500 font-medium")}>
              Due: {formatDueDate(task.dueDate)}
            </span>
          )}
          
          {isCollaboratorTask && (
            <Badge variant="outline" className="text-xs">
              Collaborator
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
