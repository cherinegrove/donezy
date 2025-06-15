
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, parseISO, isBefore } from "date-fns";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  showProject?: boolean;
  displayOptions?: string[];
}

export function TaskCard({ task, onClick, showProject = true, displayOptions = [] }: TaskCardProps) {
  const { projects, users, currentUser } = useAppContext();
  
  const project = projects.find(p => p.id === task.projectId);
  const assignee = users.find(u => u.id === task.assigneeId);
  const assignee2 = users.find(u => u.id === task.assignee2Id);
  
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

  const isAssignee2Task = task.assignee2Id === currentUser?.id && task.assigneeId !== currentUser?.id;

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        isAssignee2Task && "border-l-4 border-l-blue-500"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-sm line-clamp-2 flex-1">
              {task.title}
              {isAssignee2Task && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Assignee 2
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
              
              {assignee2 && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4 border-2 border-blue-200">
                    <AvatarImage src={assignee2.avatar} alt={assignee2.name} />
                    <AvatarFallback className="text-xs bg-blue-100">
                      {assignee2.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate max-w-[60px] text-blue-600">{assignee2.name}</span>
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
