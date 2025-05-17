
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Play, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskWatchButton } from "./TaskWatchButton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

type DisplayOption = "project" | "client" | "assignee" | "parentTask" | "dueDate" | "priority" | "status";

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { projects, users, startTimeTracking, tasks } = useAppContext();
  
  // Default display options
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([
    "project", "client", "assignee", "parentTask"
  ]);
  
  const project = projects.find(p => p.id === task.projectId);
  const assignees = users.filter(user => task.assigneeIds.includes(user.id));
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
  
  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event
    startTimeTracking(task.id);
  };

  const toggleDisplayOption = (option: DisplayOption) => {
    if (displayOptions.includes(option)) {
      setDisplayOptions(displayOptions.filter(opt => opt !== option));
    } else {
      setDisplayOptions([...displayOptions, option]);
    }
  };

  return (
    <div 
      className="border rounded-md p-4 bg-card shadow-sm hover:shadow transition-all cursor-pointer relative group"
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 hover:bg-accent"
                    onClick={(e) => e.stopPropagation()} // Prevent card click
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Customize card view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Display Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("project")}
              onCheckedChange={() => toggleDisplayOption("project")}
            >
              Project
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("client")}
              onCheckedChange={() => toggleDisplayOption("client")}
            >
              Client
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("assignee")}
              onCheckedChange={() => toggleDisplayOption("assignee")}
            >
              Assignee
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("parentTask")}
              onCheckedChange={() => toggleDisplayOption("parentTask")}
            >
              Parent Task
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("dueDate")}
              onCheckedChange={() => toggleDisplayOption("dueDate")}
            >
              Due Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("priority")}
              onCheckedChange={() => toggleDisplayOption("priority")}
            >
              Priority
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={displayOptions.includes("status")}
              onCheckedChange={() => toggleDisplayOption("status")}
            >
              Status
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleStartTimer}
                className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-100"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start timer for this task</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-base line-clamp-2 pr-6">{task.title}</h3>
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
              Parent: {parentTask.title.length > 15 ? `${parentTask.title.substring(0, 15)}...` : parentTask.title}
            </Badge>
          )}
        </div>
        
        <div className="flex justify-between items-end">
          {displayOptions.includes("assignee") && (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map(user => (
                <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  +{assignees.length - 3}
                </div>
              )}
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
