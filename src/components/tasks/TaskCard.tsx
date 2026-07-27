import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, parseISO, isBefore, isToday } from "date-fns";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick?: (e?: React.MouseEvent) => void;
  showProject?: boolean;
  displayOptions?: string[];
}

function TaskCardInner({ task, onClick, showProject = true, displayOptions = [] }: TaskCardProps) {
  const { projects, users, currentUser, clients, taskStatuses } = useAppContext();
  
  const project = projects.find(p => p.id === task.projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;
  
  // Handle both UUID and name-based assignee IDs for backward compatibility
  const assignee = task.assigneeId ? (
    users.find(u => u.id === task.assigneeId) || 
    users.find(u => u.name === task.assigneeId) ||
    users.find(u => u.name.toLowerCase().includes(task.assigneeId.toLowerCase()))
  ) : null;
                   
  const collaborators = (task.collaboratorIds || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  
  const isUrgent = task.priority === 'urgent';

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
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

  const isDueToday = (date: string) => {
    return isToday(parseISO(date));
  };

  const shouldShake = isUrgent || (task.dueDate && isDueToday(task.dueDate));

  const isCollaboratorTask = task.collaboratorIds?.includes(currentUser?.id) && task.assigneeId !== currentUser?.id;

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all relative w-full",
        "border-l-4 shadow-sm hover:shadow-md",
        "bg-card hover:bg-card/95 dark:hover:bg-slate-800",
        // Priority-based left border colors
        task.priority === 'urgent' && "border-l-red-500 border border-red-200 dark:border-red-900/30",
        task.priority === 'high' && "border-l-orange-500 border border-orange-200/50 dark:border-orange-900/30",
        task.priority === 'medium' && "border-l-yellow-500 border border-yellow-200/50 dark:border-yellow-900/30",
        task.priority === 'low' && "border-l-green-500 border border-green-200/50 dark:border-green-900/30",
        !task.priority && "border-l-gray-400 border border-gray-200/50 dark:border-gray-700/30",
        // Collaborator indicator
        isCollaboratorTask && "border-t-2 border-t-blue-500"
      )}
      onClick={handleCardClick}
    >
      {/* Red flag for urgent/due today tasks */}
      {shouldShake && (
        <div className="absolute top-8 right-2 text-2xl animate-wave">🚩</div>
      )}
      <div>
        <div className="flex items-start gap-2 mb-2">
          <h4 className="font-semibold text-xs line-clamp-2 flex-1 break-words min-w-0 text-foreground">
            {task.title}
          </h4>
          {task.priority && (
            <Badge
              className={cn(
                "text-[10px] shrink-0 whitespace-nowrap font-medium",
                task.priority === 'urgent' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                task.priority === 'high' && "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                task.priority === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
                task.priority === 'low' && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              )}
            >
              {task.priority}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {client && (
            <div className="truncate">
              <span className="text-[11px] font-medium text-muted-foreground">{client.name}</span>
            </div>
          )}

          {project && (
            <div className="truncate">
              <span className="text-[11px] font-medium text-muted-foreground">{project.name}</span>
            </div>
          )}

          {displayOptions.includes("dueDate") && task.dueDate && (
            <div className={cn(
              "text-xs font-medium shrink-0",
              isOverdue(task.dueDate) ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded" : "text-muted-foreground"
            )}>
              📅 {formatDueDate(task.dueDate)}
            </div>
          )}

          {displayOptions.includes("assignee") && assignee && (
            <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback className="text-xs font-bold">{assignee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <span className="truncate text-muted-foreground" title={assignee.name}>{assignee.name}</span>
            </div>
          )}

          {displayOptions.includes("collaborators") && collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1.5">
                {collaborators.slice(0, 3).map(collab => (
                  <Avatar key={collab?.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={collab?.avatar} />
                    <AvatarFallback className="text-xs">{collab?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {collaborators.length > 3 && (
                <span className="text-xs text-muted-foreground">+{collaborators.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardInner);
