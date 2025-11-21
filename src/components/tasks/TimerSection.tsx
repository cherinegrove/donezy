
import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TimeEntryTable } from "./TimeEntryTable";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";

interface TimerSectionProps {
  taskId: string;
}

export function TimerSection({ taskId }: TimerSectionProps) {
  const { tasks, projects, clients, currentUser, timeEntries } = useAppContext();
  const { toast } = useToast();
  const [startTimerDialogOpen, setStartTimerDialogOpen] = useState(false);
  
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
  
  const project = projects.find(p => p.id === task.projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;
  
  const handleStartTimer = () => {
    setStartTimerDialogOpen(true);
  };
  
  const handleTimerStarted = () => {
    toast({
      title: "Timer started",
      description: `Now tracking time for "${task.title}"`,
    });
  };
  
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
          onClick={handleStartTimer}
        >
          <Play className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      </div>
      
      <div className="space-y-4">
        <h4 className="text-md font-medium">Time Entries Log</h4>
        <TimeEntryTable taskId={taskId} showAllDetails={true} />
      </div>
      
      <StartTimerDialog
        open={startTimerDialogOpen}
        onOpenChange={setStartTimerDialogOpen}
        onStartTimer={handleTimerStarted}
        defaultProjectId={project?.id}
      />
    </div>
  );
}
