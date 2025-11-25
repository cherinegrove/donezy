import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Calendar, Clock, MessageSquare } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

interface StatusHistoryProps {
  taskId: string;
  currentStatus: string;
  currentBacklogReason?: string | null;
  currentDueDate?: string | null;
  currentDueDateChangeReason?: string | null;
  currentAwaitingFeedbackDetails?: string | null;
}

interface HistoryLog {
  id: string;
  action: string;
  timestamp: string;
  user_id: string;
  details: any;
}

export function StatusHistorySection({
  taskId,
  currentStatus,
  currentBacklogReason,
  currentDueDate,
  currentDueDateChangeReason,
  currentAwaitingFeedbackDetails,
}: StatusHistoryProps) {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { users } = useAppContext();

  useEffect(() => {
    loadHistory();
  }, [taskId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("task_logs")
        .select("*")
        .eq("task_id", taskId)
        .in("action", [
          "status_changed",
          "backlog_reason_added",
          "due_date_changed",
          "awaiting_feedback_details_added",
        ])
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading status history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || "Unknown User";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "backlog":
        return "secondary";
      case "in-progress":
        return "default";
      case "awaiting-feedback":
        return "outline";
      case "done":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Status Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Status Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getStatusBadgeVariant(currentStatus)}>
                {currentStatus}
              </Badge>
            </div>
          </div>

          {currentStatus === "backlog" && currentBacklogReason && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Backlog Reason:</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {currentBacklogReason}
              </p>
            </div>
          )}

          {currentStatus === "in-progress" && currentDueDate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Due Date:</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {format(new Date(currentDueDate), "PPP")}
              </p>
              {currentDueDateChangeReason && (
                <>
                  <span className="text-sm font-medium pl-6">Reason:</span>
                  <p className="text-sm text-muted-foreground pl-6">
                    {currentDueDateChangeReason}
                  </p>
                </>
              )}
            </div>
          )}

          {currentAwaitingFeedbackDetails && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Awaiting Feedback Details:</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {currentAwaitingFeedbackDetails}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No status change history available.
            </p>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {history.map((log, index) => (
                  <div key={log.id}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), "PPp")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            by {getUserName(log.user_id)}
                          </p>
                        </div>
                      </div>

                      {log.details && (
                        <div className="pl-4 space-y-1">
                          {log.details.oldStatus && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">From:</span>{" "}
                              <Badge
                                variant={getStatusBadgeVariant(
                                  log.details.oldStatus
                                )}
                                className="text-xs"
                              >
                                {log.details.oldStatus}
                              </Badge>
                              {" → "}
                              <Badge
                                variant={getStatusBadgeVariant(
                                  log.details.newStatus
                                )}
                                className="text-xs"
                              >
                                {log.details.newStatus}
                              </Badge>
                            </p>
                          )}
                          {log.details.backlogReason && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Reason:
                              </span>{" "}
                              {log.details.backlogReason}
                            </p>
                          )}
                          {log.details.dueDate && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Due Date:
                              </span>{" "}
                              {format(new Date(log.details.dueDate), "PPP")}
                            </p>
                          )}
                          {log.details.dueDateChangeReason && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Reason:
                              </span>{" "}
                              {log.details.dueDateChangeReason}
                            </p>
                          )}
                          {log.details.awaitingFeedbackDetails && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Details:
                              </span>{" "}
                              {log.details.awaitingFeedbackDetails}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {index < history.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
