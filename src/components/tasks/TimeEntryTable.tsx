
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { TimeEntry, TimeEntryStatus } from "@/types";

interface TimeEntryTableProps {
  taskId?: string;
  projectId?: string;
  userId?: string;
  showAllDetails?: boolean;
}

export function TimeEntryTable({ taskId, projectId, userId, showAllDetails = false }: TimeEntryTableProps) {
  const { timeEntries, deleteTimeEntry, updateTimeEntryStatus, tasks, projects, clients, users, activeTimeEntry } = useAppContext();

  let filteredEntries = timeEntries;
  
  if (taskId) {
    filteredEntries = filteredEntries.filter(entry => entry.taskId === taskId);
  }
  if (projectId) {
    filteredEntries = filteredEntries.filter(entry => entry.projectId === projectId);
  }
  if (userId) {
    filteredEntries = filteredEntries.filter(entry => entry.userId === userId);
  }

  // Include active time entry if it matches the filters
  let allEntries = [...filteredEntries];
  if (activeTimeEntry) {
    const matchesFilters = 
      (!taskId || activeTimeEntry.taskId === taskId) &&
      (!projectId || activeTimeEntry.projectId === projectId) &&
      (!userId || activeTimeEntry.userId === userId);
    
    if (matchesFilters) {
      allEntries = [activeTimeEntry, ...filteredEntries];
    }
  }

  // Sort by start time, most recent first
  const sortedEntries = [...allEntries].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  const getStatusColor = (status: TimeEntryStatus) => {
    switch (status) {
      case 'approved':
      case 'approved-billable':
        return 'bg-green-100 text-green-800';
      case 'approved-non-billable':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateActiveDuration = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    return minutes;
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  const handleStatusChange = (entryId: string, newStatus: TimeEntryStatus) => {
    updateTimeEntryStatus(entryId, newStatus);
  };

  const getTaskName = (taskId?: string) => {
    if (!taskId) return "No task";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "Unknown task";
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "No project";
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown project";
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || "Unknown user";
  };

  const isActiveEntry = (entry: TimeEntry) => {
    return activeTimeEntry && entry.id === activeTimeEntry.id;
  };

  if (sortedEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No time entries found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start Time</TableHead>
            <TableHead>Duration</TableHead>
            {showAllDetails && !taskId && <TableHead>Task</TableHead>}
            {showAllDetails && !projectId && <TableHead>Project</TableHead>}
            {showAllDetails && <TableHead>User</TableHead>}
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => {
            const isActive = isActiveEntry(entry);
            const duration = isActive ? calculateActiveDuration(entry.startTime) : entry.duration;
            
            return (
              <TableRow key={entry.id} className={isActive ? "bg-green-50 dark:bg-green-900/20" : ""}>
                <TableCell className="font-mono text-sm">
                  {formatTime(entry.startTime)}
                </TableCell>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    {isActive && <Clock className="h-3 w-3 text-green-600" />}
                    {formatDuration(duration)}
                    {isActive && <span className="text-xs text-green-600">(active)</span>}
                  </div>
                </TableCell>
                {showAllDetails && !taskId && (
                  <TableCell>{getTaskName(entry.taskId)}</TableCell>
                )}
                {showAllDetails && !projectId && (
                  <TableCell>{getProjectName(entry.projectId)}</TableCell>
                )}
                {showAllDetails && (
                  <TableCell>{getUserName(entry.userId)}</TableCell>
                )}
                <TableCell>
                  <div className="max-w-xs">
                    {entry.description || entry.notes || (isActive ? "Timer running..." : "-")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(entry.status || 'pending')}>
                    {isActive ? "active" : (entry.status || 'pending')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.billable ? "default" : "secondary"}>
                    {entry.billable ? "Billable" : "Non-billable"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteTimeEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isActive && (
                      <span className="text-xs text-muted-foreground">Timer running</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
