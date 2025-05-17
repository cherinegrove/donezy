
import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RecordActions } from "@/components/common/RecordActions";
import { EditTimeEntryDialog } from "@/components/time/EditTimeEntryDialog";
import { TimeEntryStatus } from "@/types";

interface TimeEntryTableProps {
  taskId: string;
}

export function TimeEntryTable({ taskId }: TimeEntryTableProps) {
  const { timeEntries, currentUser, updateTimeEntryStatus } = useAppContext();
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === taskId);
  
  const handleEditTimeEntry = (entryId: string) => {
    setSelectedTimeEntry(entryId);
    setIsEditDialogOpen(true);
  };
  
  const handleApproveTimeEntry = (entryId: string) => {
    if (currentUser) {
      updateTimeEntryStatus(entryId, "approved-billable", currentUser.id);
    }
  };
  
  const handleDeclineTimeEntry = (entryId: string) => {
    if (currentUser) {
      updateTimeEntryStatus(entryId, "declined", currentUser.id);
    }
  };
  
  const getStatusBadge = (status: TimeEntryStatus) => {
    switch (status) {
      case "approved-billable":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case "approved-non-billable":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Approved (Non-billable)</Badge>;
      case "declined":
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Declined</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
    }
  };
  
  const getSelectedTimeEntry = () => {
    return timeEntries.find(entry => entry.id === selectedTimeEntry);
  };
  
  if (taskTimeEntries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No time entries for this task
      </div>
    );
  }
  
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Billable</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taskTimeEntries.map(entry => {
            const startDate = new Date(entry.startTime);
            const durationHours = Math.floor(entry.duration / 60);
            const durationMinutes = entry.duration % 60;
            const canEdit = entry.userId === currentUser?.id || isAdminOrManager;
            
            return (
              <TableRow key={entry.id}>
                <TableCell>{format(startDate, "MMM d, yyyy")}</TableCell>
                <TableCell>{`${durationHours}h ${durationMinutes}m`}</TableCell>
                <TableCell>{entry.notes || "-"}</TableCell>
                <TableCell>{getStatusBadge(entry.status)}</TableCell>
                <TableCell className="text-right">{entry.billable ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <RecordActions
                    recordId={entry.id}
                    recordType="Time Entry"
                    recordName={`${format(startDate, "MMM d, yyyy")} (${durationHours}h ${durationMinutes}m)`}
                    onEdit={() => handleEditTimeEntry(entry.id)}
                    onApprove={() => handleApproveTimeEntry(entry.id)}
                    onDecline={() => handleDeclineTimeEntry(entry.id)}
                    disableEdit={!canEdit}
                    disableDelete={!isAdminOrManager}
                    showApproveDecline={isAdminOrManager && entry.status === "pending"}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      <EditTimeEntryDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedTimeEntry(null);
        }}
        timeEntry={getSelectedTimeEntry()}
      />
    </>
  );
}
