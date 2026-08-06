
import React, { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronDown, ChevronRight } from "lucide-react";
import { TimeEntryEventLog } from "@/components/time/TimeEntryEventLog";
import { format } from "date-fns";
import { TimeEntry, TimeEntryStatus } from "@/types";

interface TimeEntryTableProps {
  taskId?: string;
  projectId?: string;
  userId?: string;
  showAllDetails?: boolean;
}

export function TimeEntryTable({ taskId, projectId, userId, showAllDetails = false }: TimeEntryTableProps) {
  const { timeEntries, tasks, projects, clients, users, activeTimeEntry, getElapsedTime } = useAppContext();
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

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
  // First, remove any existing entry with the same ID as activeTimeEntry to avoid duplicates
  let allEntries = activeTimeEntry 
    ? filteredEntries.filter(entry => entry.id !== activeTimeEntry.id)
    : [...filteredEntries];
    
  if (activeTimeEntry) {
    const matchesFilters = 
      (!taskId || activeTimeEntry.taskId === taskId) &&
      (!projectId || activeTimeEntry.projectId === projectId) &&
      (!userId || activeTimeEntry.userId === userId);
    
    if (matchesFilters) {
      allEntries = [activeTimeEntry, ...allEntries];
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

  const getProjectName = (projectId?: string) => {
    if (!projectId) return "No project";
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown project";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate active duration from start_time (consistent for all users)
  const calculateActiveDuration = (entry: TimeEntry) => {
    // Use getElapsedTime with applyLocalPauseState=false for consistent display across users
    const elapsedStr = getElapsedTime(entry, false);
    const [hours, minutes, seconds] = elapsedStr.split(':').map(Number);
    return hours * 60 + minutes; // Return in minutes to match duration format
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  const getTaskName = (taskId?: string) => {
    if (!taskId) return "No task";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || "Unknown task";
  };

  const isActiveEntry = (entry: TimeEntry) => {
    return activeTimeEntry && entry.id === activeTimeEntry.id;
  };

  const isUnsavedEntry = (entry: TimeEntry) => {
    return !entry.endTime;
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
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => {
            const isActive = isActiveEntry(entry);
            const isUnsaved = isUnsavedEntry(entry);
            const isOtherUserUnsaved = isUnsaved && !isActive;
            const duration = isUnsaved ? calculateActiveDuration(entry) : entry.duration;
            
            const isExpanded = expandedEntries.has(entry.id);
            const colCount = 4 + (showAllDetails && !taskId ? 1 : 0);
            
            return (
              <React.Fragment key={entry.id}>
              <TableRow 
                className={`cursor-pointer ${isActive ? "bg-green-50 dark:bg-green-900/20" : isOtherUserUnsaved ? "bg-orange-50 dark:bg-orange-900/20" : "hover:bg-muted/50"}`}
                onClick={() => toggleExpanded(entry.id)}
              >
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-1">
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    {formatTime(entry.startTime)}
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    {isActive && <Clock className="h-3 w-3 text-green-600" />}
                    {isOtherUserUnsaved && <Clock className="h-3 w-3 text-orange-600" />}
                    {formatDuration(duration)}
                    {isActive && <span className="text-xs text-green-600">(active)</span>}
                    {isOtherUserUnsaved && <span className="text-xs text-orange-600">(unsaved)</span>}
                  </div>
                </TableCell>
                {showAllDetails && !taskId && (
                  <TableCell>{getTaskName(entry.taskId)}</TableCell>
                )}
                <TableCell>
                  <div className="max-w-xs">
                    {entry.description || entry.notes || (isActive ? "Timer running..." : "-")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(entry.status || 'pending')}>
                    {isActive ? "active" : isOtherUserUnsaved ? "unsaved" : (entry.status || 'pending')}
                  </Badge>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={colCount} className="p-0">
                    <TimeEntryEventLog timeEntryId={entry.id} />
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
