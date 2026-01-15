import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, Clock, MessageSquare, Plus, Edit } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StatusHistoryProps {
  taskId: string;
  currentStatus: string;
  currentBacklogReason?: string | null;
  currentDueDate?: string | null;
  currentDueDateChangeReason?: string | null;
  currentAwaitingFeedbackDetails?: string | null;
  onStatusInfoUpdated?: () => void;
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
  onStatusInfoUpdated,
}: StatusHistoryProps) {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { users, currentUser, updateTask } = useAppContext();
  const { toast } = useToast();

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
          "status_info_updated",
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
      case "review":
        return "outline";
      case "done":
        return "default";
      default:
        return "secondary";
    }
  };

  const getUpdateLabel = () => {
    switch (currentStatus) {
      case "backlog":
        return "Update backlog reason";
      case "review":
      case "awaiting-feedback":
        return "Add feedback update";
      case "in-progress":
        return "Update progress note";
      default:
        return "Add status note";
    }
  };

  const getUpdatePlaceholder = () => {
    switch (currentStatus) {
      case "backlog":
        return "Why is this task still in backlog?";
      case "review":
      case "awaiting-feedback":
        return "What feedback are you waiting for? Any updates?";
      case "in-progress":
        return "What's the current progress or blockers?";
      default:
        return "Add a note about the current status...";
    }
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !currentUser) return;

    setIsSaving(true);
    try {
      // Determine which field to update based on current status
      let updateData: any = {};
      let actionType = "status_info_updated";
      let logDetails: any = {
        status: currentStatus,
        note: updateText.trim(),
      };

      if (currentStatus === "backlog") {
        updateData.backlogReason = updateText.trim();
        actionType = "backlog_reason_added";
        logDetails.backlogReason = updateText.trim();
      } else if (currentStatus === "review" || currentStatus === "awaiting-feedback") {
        updateData.awaitingFeedbackDetails = updateText.trim();
        actionType = "awaiting_feedback_details_added";
        logDetails.awaitingFeedbackDetails = updateText.trim();
      } else if (currentStatus === "in-progress") {
        // For in-progress, we can update the due date change reason as a progress note
        updateData.dueDateChangeReason = updateText.trim();
        actionType = "status_info_updated";
        logDetails.progressNote = updateText.trim();
      }

      // Update the task
      await updateTask(taskId, updateData);

      // Log the update
      const { error: logError } = await supabase.from("task_logs").insert({
        task_id: taskId,
        user_id: currentUser.id,
        auth_user_id: currentUser.auth_user_id,
        action: actionType,
        details: logDetails,
        timestamp: new Date().toISOString(),
      });

      if (logError) {
        console.error("Error logging update:", logError);
      }

      toast({
        title: "Update Added",
        description: "Status information has been updated.",
      });

      setUpdateText("");
      setIsUpdateDialogOpen(false);
      loadHistory();
      onStatusInfoUpdated?.();
    } catch (error) {
      console.error("Error adding update:", error);
      toast({
        title: "Error",
        description: "Failed to add update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if current status supports updates
  const canAddUpdate = ["backlog", "review", "awaiting-feedback", "in-progress"].includes(currentStatus);

  return (
    <div className="space-y-4">
      {/* Current Status Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status Information
            </CardTitle>
            {canAddUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Update
              </Button>
            )}
          </div>
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
                  <span className="text-sm font-medium pl-6">Note:</span>
                  <p className="text-sm text-muted-foreground pl-6">
                    {currentDueDateChangeReason}
                  </p>
                </>
              )}
            </div>
          )}

          {(currentStatus === "review" || currentStatus === "awaiting-feedback") && currentAwaitingFeedbackDetails && (
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

          {!currentBacklogReason && !currentAwaitingFeedbackDetails && !currentDueDateChangeReason && canAddUpdate && (
            <p className="text-sm text-muted-foreground italic">
              No status details added yet. Click "Add Update" to add information.
            </p>
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
                          {log.details.note && !log.details.backlogReason && !log.details.awaitingFeedbackDetails && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Note:
                              </span>{" "}
                              {log.details.note}
                            </p>
                          )}
                          {log.details.progressNote && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">
                                Progress:
                              </span>{" "}
                              {log.details.progressNote}
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

      {/* Add Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getUpdateLabel()}</DialogTitle>
            <DialogDescription>
              Add an update for the current status without changing the task status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-text">Update Details</Label>
              <Textarea
                id="update-text"
                placeholder={getUpdatePlaceholder()}
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateText("");
                setIsUpdateDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUpdate}
              disabled={!updateText.trim() || isSaving}
            >
              {isSaving ? "Saving..." : "Add Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
