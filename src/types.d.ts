import { Task } from "./types";

// Add or modify these types
declare module "@/types" {
  interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: "low" | "medium" | "high";
    projectId: string;
    createdAt: string;
    dueDate?: string;
    startDate?: string;
    assigneeId?: string;  // Single assignee (owner)
    collaboratorIds: string[]; // Multiple collaborators
    timeEntries: TimeEntry[];
    comments: Comment[];
    parentTaskId?: string;
    customFields: Record<string, any>;
    watcherIds: string[];
  }
  
  // Other types remain unchanged
}
