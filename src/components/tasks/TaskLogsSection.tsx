
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";

interface TaskLogsSectionProps {
  taskId: string;
}

export function TaskLogsSection({ taskId }: TaskLogsSectionProps) {
  // This is a placeholder component
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Task Activity Log</h3>
      
      <div className="space-y-3">
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <div className="text-sm flex items-center gap-2">
              <span className="font-medium">System</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <p className="text-sm mt-1">Task was created</p>
          </div>
        </div>
      </div>
    </div>
  );
}
