import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Clock, Play } from "lucide-react";
import { TimeEntryTable } from "./TimeEntryTable";
import { Button } from "@/components/ui/button";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";

interface TimerSectionProps {
  taskId: string;
}

export function TimerSection({ taskId }: TimerSectionProps) {
  const { tasks, timeEntries } = useAppContext();
  const [showStartTimerDialog, setShowStartTimerDialog] = useState(false);
  
  // Add null check for tasks
  const task = tasks && Array.isArray(tasks) ? tasks.find(t => t && t.id === taskId) : null;
  
  // Fallback if task not found
  if (!task) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Task not found
      </div>
    );
  }
  
  // Get time entries for this task
  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === taskId);
  
  // Calculate total time logged
  const totalMinutes = taskTimeEntries.reduce((total, entry) => total + entry.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Time Tracking</h3>
          {taskTimeEntries.length > 0 && (
            <div className="flex items-center text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
              <Clock className="h-3 w-3 mr-1" />
              <span>Total: {hours}h {minutes}m</span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowStartTimerDialog(true)}
        >
          <Play className="h-4 w-4 mr-1" />
          Start Timer
        </Button>
      </div>
      
      <div className="space-y-4">
        <h4 className="text-md font-medium">Time Entries Log</h4>
        <TimeEntryTable taskId={taskId} showAllDetails={true} />
      </div>
      
      <StartTimerDialog
        open={showStartTimerDialog}
        onOpenChange={setShowStartTimerDialog}
        onStartTimer={() => setShowStartTimerDialog(false)}
        defaultProjectId={task.projectId}
        defaultTaskId={taskId}
      />
    </div>
  );
}
