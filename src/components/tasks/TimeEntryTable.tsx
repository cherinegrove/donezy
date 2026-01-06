
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
import { Edit, Trash2, Clock, MoreHorizontal, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { TimeEntry, TimeEntryStatus } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface TimeEntryTableProps {
  taskId?: string;
  projectId?: string;
  userId?: string;
  showAllDetails?: boolean;
}

export function TimeEntryTable({ taskId, projectId, userId, showAllDetails = false }: TimeEntryTableProps) {
  const { timeEntries, deleteTimeEntry, updateTimeEntryStatus, tasks, projects, clients, users, activeTimeEntry, currentUser, customRoles, getElapsedTime } = useAppContext();
  const { toast } = useToast();

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

  // Check if this is the current user's active timer
  const isActiveEntry = (entry: TimeEntry) => {
    return activeTimeEntry && entry.id === activeTimeEntry.id;
  };

  // Check if entry is unsaved (no end time) - applies to any user's timer
  const isUnsavedEntry = (entry: TimeEntry) => {
    return !entry.endTime;
  };

  // Checks if current user can edit a time entry
  const canEditTimeEntry = (entry: TimeEntry) => {
    // Users can edit their own entries
    if (entry.userId === currentUser?.id) return true;
    
    // Admins can edit any entry
    if (currentUser && (currentUser.roleId === 'admin' || customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin')) return true;
    
    return false;
  };

  // Checks if current user can approve/decline a time entry
  const canApproveTimeEntry = () => {
    // Only admins can approve/decline time entries
    const isAdmin = currentUser && (currentUser.roleId === 'admin' || customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin');
    console.log("🔍 TimeEntryTable canApproveTimeEntry:", {
      currentUser: currentUser?.name,
      currentUserRole: currentUser?.roleId,
      customRoles: customRoles?.map(r => ({ id: r.id, name: r.name })),
      isAdmin,
      hasCurrentUser: !!currentUser
    });
    return isAdmin;
  };

  const handleApproveTimeEntry = (entry: TimeEntry, billable: boolean = true) => {
    if (!currentUser) return;
    
    const status = billable ? "approved-billable" : "approved-non-billable";
    updateTimeEntryStatus(entry.id, status, currentUser.auth_user_id);
    
    toast({
      title: "Time Entry Approved",
      description: `The time entry has been marked as ${billable ? 'billable' : 'non-billable'}.`,
    });
  };
  
  const handleDeclineTimeEntry = (entry: TimeEntry) => {
    if (!currentUser) return;
    
    updateTimeEntryStatus(entry.id, "declined", currentUser.auth_user_id);
    
    toast({
      title: "Time Entry Declined",
      description: "The time entry has been declined.",
    });
  };

  const handleReopenTimeEntry = (entry: TimeEntry) => {
    if (!currentUser) return;
    
    updateTimeEntryStatus(entry.id, "pending", currentUser.auth_user_id);
    
    toast({
      title: "Time Entry Reopened",
      description: "The time entry has been set back to pending for editing.",
    });
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
            const isUnsaved = isUnsavedEntry(entry);
            const isOtherUserUnsaved = isUnsaved && !isActive;
            const duration = isUnsaved ? calculateActiveDuration(entry) : entry.duration;
            
            return (
              <TableRow key={entry.id} className={isActive ? "bg-green-50 dark:bg-green-900/20" : isOtherUserUnsaved ? "bg-orange-50 dark:bg-orange-900/20" : ""}>
                <TableCell className="font-mono text-sm">
                  {formatTime(entry.startTime)}
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
                    {isActive ? "active" : isOtherUserUnsaved ? "unsaved" : (entry.status || 'pending')}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border z-50">
                          {(() => {
                            const canApprove = canApproveTimeEntry();
                            const isPending = entry.status === 'pending';
                            console.log("🔍 TimeEntryTable dropdown debug:", {
                              entryId: entry.id,
                              entryStatus: entry.status,
                              canApprove,
                              isPending,
                              showApproveOptions: canApprove && isPending
                            });
                            return null;
                          })()}
                          {canApproveTimeEntry() && entry.status === 'pending' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleApproveTimeEntry(entry, true)}
                                className="text-green-600 focus:text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Approve (Billable)</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleApproveTimeEntry(entry, false)}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Approve (Non-billable)</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeclineTimeEntry(entry)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                <span>Decline</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canApproveTimeEntry() && entry.status !== 'pending' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleReopenTimeEntry(entry)}
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                <span>Reopen for Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canEditTimeEntry(entry) && (
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Time Entry</span>
                            </DropdownMenuItem>
                          )}
                          {canEditTimeEntry(entry) && (
                            <DropdownMenuItem 
                              onClick={() => deleteTimeEntry(entry.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
