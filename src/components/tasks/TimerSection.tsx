
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface TimerSectionProps {
  taskId: string;
}

export function TimerSection({ taskId }: TimerSectionProps) {
  const { tasks } = useAppContext();
  const task = tasks.find(t => t.id === taskId);
  
  // Fallback if task not found
  if (!task) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Task not found
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Time Tracking</h3>
        <Button size="sm">
          <Play className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      </div>
      
      <div className="text-center py-4 text-muted-foreground">
        No time entries for this task
      </div>
    </div>
  );
}
