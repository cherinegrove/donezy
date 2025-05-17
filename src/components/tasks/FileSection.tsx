
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileSectionProps {
  taskId: string;
}

export function FileSection({ taskId }: FileSectionProps) {
  const { tasks } = useAppContext();
  
  // Add null check for tasks
  const safeTask = tasks && Array.isArray(tasks) ? tasks.find(t => t && t.id === taskId) : null;
  
  // Fallback if task not found
  if (!safeTask) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Task not found
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Files</h3>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>
      
      <div className="text-center py-4 text-muted-foreground">
        No files attached to this task
      </div>
    </div>
  );
}
