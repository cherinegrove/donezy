import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskLogsSectionProps {
  taskId: string;
}

interface TaskLogRow {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  timestamp: string;
}

// Turns a raw task_logs row into a readable one-liner. Structured actions
// (status_changed etc.) carry a details jsonb payload; general edits store a
// pre-joined change summary in `action` already. Status values are mapped to
// the org's display labels — historical rows store internal values.
function describeLog(
  log: TaskLogRow,
  statusLabel: (value: string) => string,
): string {
  const details = log.details || {};
  switch (log.action) {
    case "status_changed":
      return `changed status from "${statusLabel(String(details.oldStatus ?? "?"))}" to "${statusLabel(String(details.newStatus ?? "?"))}"`;
    case "backlog_reason_added":
      return `added a backlog reason: ${details.backlogReason ?? ""}`;
    case "due_date_changed":
      return `changed the due date to ${details.dueDate ?? "none"}${details.dueDateChangeReason ? ` (${details.dueDateChangeReason})` : ""}`;
    case "awaiting_feedback_details_added":
      return "added awaiting-feedback details";
    default:
      return log.action;
  }
}

export function TaskLogsSection({ taskId }: TaskLogsSectionProps) {
  const { tasks, users, taskStatuses } = useAppContext();
  const statusLabel = (value: string): string =>
    taskStatuses.find((s) => s.value === value)?.label || value;
  const [logs, setLogs] = useState<TaskLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      // Query per task directly — the global context taskLogs array is capped
      // and misses older activity entirely.
      const { data, error } = await supabase
        .from("task_logs")
        .select("id, user_id, action, details, timestamp")
        .eq("task_id", taskId)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error loading task logs:", error);
      } else {
        setLogs((data as TaskLogRow[]) || []);
      }
      setIsLoading(false);
    };

    loadLogs();
  }, [taskId]);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Task Activity Log</h3>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : logs.length > 0 ? (
          logs.map((log) => {
            const logUser = users.find((u) => u.id === log.user_id);
            return (
              <div key={log.id} className="flex gap-3 items-start">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={logUser?.avatar} />
                  <AvatarFallback>
                    {logUser?.name?.substring(0, 2) || "SY"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium">
                      {logUser?.name || "System"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{describeLog(log, statusLabel)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex gap-3 items-start">
            <Avatar className="h-6 w-6">
              <AvatarFallback>SY</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm flex items-center gap-2">
                <span className="font-medium">System</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <p className="text-sm mt-1">Task was created</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
