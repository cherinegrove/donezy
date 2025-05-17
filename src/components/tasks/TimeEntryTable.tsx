
import React from "react";
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

interface TimeEntryTableProps {
  taskId: string;
}

export function TimeEntryTable({ taskId }: TimeEntryTableProps) {
  const { timeEntries } = useAppContext();
  
  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === taskId);
  
  if (taskTimeEntries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No time entries for this task
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Billable</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taskTimeEntries.map(entry => {
          const startDate = new Date(entry.startTime);
          const durationHours = Math.floor(entry.duration / 60);
          const durationMinutes = entry.duration % 60;
          
          return (
            <TableRow key={entry.id}>
              <TableCell>{format(startDate, "MMM d, yyyy")}</TableCell>
              <TableCell>{`${durationHours}h ${durationMinutes}m`}</TableCell>
              <TableCell>{entry.notes || "-"}</TableCell>
              <TableCell className="text-right">{entry.billable ? "Yes" : "No"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
