
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  const { users, taskStatuses } = useAppContext();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "todo":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const assignee = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
        
        return (
          <Card 
            key={task.id} 
            className={`border-l-4 ${getPriorityColor(task.priority)} ${onTaskClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
            onClick={() => onTaskClick?.(task)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <Badge className={getStatusColor(task.status)}>
                  {taskStatuses.find(s => s.value === task.status)?.label || task.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {task.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {assignee && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{assignee.name}</span>
                  </div>
                )}
                
                {task.dueDate && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(task.dueDate), "MMM dd, yyyy")}
                  </div>
                )}
                
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Priority: {task.priority}
                </div>
              </div>
              
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">
                    Subtasks ({task.subtasks.length})
                  </p>
                  <div className="space-y-1">
                    {task.subtasks.slice(0, 3).map((subtask, index) => (
                      <div key={index} className="text-sm text-muted-foreground pl-4 border-l-2 border-gray-200">
                        {subtask.title}
                      </div>
                    ))}
                    {task.subtasks.length > 3 && (
                      <div className="text-sm text-muted-foreground pl-4">
                        +{task.subtasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
