
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";

interface RelatedTasksSectionProps {
  taskId: string;
}

export function RelatedTasksSection({ taskId }: RelatedTasksSectionProps) {
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
        <h3 className="text-lg font-medium">Related Tasks</h3>
        <Button size="sm">
          <Link className="h-4 w-4 mr-2" />
          Link Task
        </Button>
      </div>
      
      <div className="text-center py-4 text-muted-foreground">
        No related tasks
      </div>
    </div>
  );
}
