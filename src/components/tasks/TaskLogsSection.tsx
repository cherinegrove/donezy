
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskLogsSectionProps {
  taskId: string;
}

export function TaskLogsSection({ taskId }: TaskLogsSectionProps) {
  const { tasks, users, taskLogs } = useAppContext();
  
  // Filter logs for this task
  const taskSpecificLogs = taskLogs?.filter(log => log.taskId === taskId) || [];
  
  // Sort logs by timestamp (newest first)
  const sortedLogs = [...taskSpecificLogs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Get task details
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Task Activity Log</h3>
      
      <div className="space-y-3">
        {sortedLogs.length > 0 ? (
          sortedLogs.map(log => {
            const logUser = users.find(u => u.id === log.userId);
            return (
              <div key={log.id} className="flex gap-3 items-start">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={logUser?.avatar} />
                  <AvatarFallback>{logUser?.name?.substring(0, 2) || "SY"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium">{logUser?.name || "System"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{log.action}</p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex gap-3 items-start">
            <Avatar className="h-6 w-6">
              <AvatarFallback>SY</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm flex items-center gap-2">
                <span className="font-medium">System</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <p className="text-sm mt-1">Task was created</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
