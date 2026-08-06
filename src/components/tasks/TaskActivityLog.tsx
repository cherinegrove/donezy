import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calendar, Clock, MessageSquare, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

interface TaskActivityLogProps {
  taskId: string;
  currentStatus?: string;
  currentBacklogReason?: string | null;
  currentDueDate?: string | null;
  currentDueDateChangeReason?: string | null;
  currentAwaitingFeedbackDetails?: string | null;
  customFormResponses?: {
    formId: string;
    responses: Record<string, string>;
    respondedAt: string;
  } | null;
  onStatusInfoUpdated?: () => void;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user_id: string | null;
  details: any;
}

interface AwaitingFeedbackData {
  what: string;
  who: string;
  why: string;
  when: string;
}

function parseAwaitingFeedbackDetails(details?: string | null): AwaitingFeedbackData | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object" && "what" in parsed) return parsed;
  } catch {}
  return { what: details, who: "", why: "", when: "" };
}

function AwaitingFeedbackDisplay({ details }: { details?: string | null }) {
  const parsed = parseAwaitingFeedbackDetails(details);
  if (!parsed) return null;

  const rows = [
    { label: "What", value: parsed.what },
    { label: "Who", value: parsed.who },
    { label: "Why", value: parsed.why },
    {
      label: "Need by",
      value: parsed.when ? format(new Date(parsed.when), "PPP") : "",
    },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <p key={r.label} className="text-sm">
          <span className="text-muted-foreground">{r.label}:</span> {r.value}
        </p>
      ))}
    </div>
  );
}

function describeAction(
  action: string,
  details: any,
  statusLabel: (value: string) => string
): string {
  switch (action) {
    case "status_changed":
      return `changed status from "${statusLabel(String(details.oldStatus ?? "?"))}" to "${statusLabel(String(details.newStatus ?? "?"))}"`;
    case "backlog_reason_added":
      return `added a backlog reason: ${details.backlogReason ?? ""}`;
    case "due_date_changed":
      return `changed the due date to ${details.dueDate ?? "none"}${details.dueDateChangeReason ? ` (${details.dueDateChangeReason})` : ""}`;
    case "awaiting_feedback_details_added":
      return "added awaiting-feedback details";
    case "status_info_updated":
      return `added a status note: ${details.note ?? ""}`;
    default:
      return action.replace(/_/g, " ");
  }
}

export function TaskActivityLog({
  taskId,
  currentStatus = "",
  currentBacklogReason,
  currentDueDate,
  currentDueDateChangeReason,
  currentAwaitingFeedbackDetails,
  customFormResponses,
  onStatusInfoUpdated,
}: TaskActivityLogProps) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { users, currentUser, updateTask, taskStatuses } = useAppContext();
  const statusLabel = (value: string): string =>
    taskStatuses.find((s) => s.value === value)?.label || value;
  const { toast } = useToast();

  useEffect(() => {
    loadActivity();
  }, [taskId]);

  const loadActivity = async () => {
    try {
      const { data, error } = await supabase
        .from("task_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setActivity(data || []);
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "System";
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
        updateData.dueDateChangeReason = updateText.trim();
        actionType = "status_info_updated";
        logDetails.progressNote = updateText.trim();
      }

      await updateTask(taskId, updateData);

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
      loadActivity();
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

  const canAddUpdate = ["backlog", "review", "awaiting-feedback", "in-progress"].includes(currentStatus);

  return (
    <div className="space-y-4">
      {/* Current Status Information - only show if currentStatus is provided */}
      {currentStatus && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
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
                {statusLabel(currentStatus)}
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
                <span className="text-sm font-medium">Awaiting Feedback:</span>
              </div>
              <div className="pl-6">
                <AwaitingFeedbackDisplay details={currentAwaitingFeedbackDetails} />
              </div>
            </div>
          )}

          {customFormResponses && customFormResponses.responses && Object.keys(customFormResponses.responses).length > 0 && (
            <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">Stage Information</span>
              </div>
              <div className="pl-6 space-y-2">
                {Object.entries(customFormResponses.responses).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-muted-foreground">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!currentBacklogReason && !currentAwaitingFeedbackDetails && !currentDueDateChangeReason && !customFormResponses && canAddUpdate && (
            <p className="text-sm text-muted-foreground italic">
              No status details added yet. Click "Add Update" to add information.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. This task was just created.
            </p>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {activity.map((log, index) => {
                  const logUser = users.find((u) => u.id === log.user_id);
                  return (
                    <div key={log.id}>
                      <div className="flex gap-3 items-start">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={logUser?.avatar} />
                          <AvatarFallback>
                            {logUser?.name?.substring(0, 2) || "SY"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {logUser?.name || "System"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            {describeAction(log.action, log.details || {}, statusLabel)}
                          </p>

                          {/* Show structured details for status changes */}
                          {log.action === "status_changed" && log.details?.oldStatus && (
                            <div className="pl-4 mt-2">
                              <p className="text-sm">
                                <Badge variant={getStatusBadgeVariant(log.details.oldStatus)} className="text-xs">
                                  {statusLabel(log.details.oldStatus)}
                                </Badge>
                                {" → "}
                                <Badge variant={getStatusBadgeVariant(log.details.newStatus)} className="text-xs">
                                  {statusLabel(log.details.newStatus)}
                                </Badge>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < activity.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })}
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
