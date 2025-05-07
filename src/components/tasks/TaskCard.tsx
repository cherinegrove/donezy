
import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { getUserById, startTimeTracking } = useAppContext();
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100";
    }
  };

  const formattedDate = task.dueDate ? format(new Date(task.dueDate), "MMM d") : null;
  const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTimeTracking(task.id);
  };

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md cursor-pointer" 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="font-medium">{task.title}</div>
          
          <div className="flex justify-between items-center text-sm">
            <div className="flex space-x-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                getPriorityColor(task.priority)
              )}>
                {task.priority}
              </span>
            </div>
            {formattedDate && (
              <div className={cn(
                "text-xs", 
                isPastDue ? "text-red-500 font-medium" : "text-muted-foreground"
              )}>
                {isPastDue ? "Overdue" : formattedDate}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {task.assigneeIds.slice(0, 3).map((userId) => {
                const user = getUserById(userId);
                return (
                  <Avatar key={userId} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-xs">
                      {user?.name?.slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {task.assigneeIds.length > 3 && (
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{task.assigneeIds.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 border-primary/20 bg-primary/10 hover:bg-primary/20"
              onClick={handleStartTimer}
            >
              <Play className="mr-1 h-3 w-3" />
              Track
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
