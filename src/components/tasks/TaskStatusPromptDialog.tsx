import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Task } from "@/types";

interface AwaitingFeedbackData {
  what: string;
  who: string;
  why: string;
  when: string; // ISO date string
}

function parseAwaitingFeedbackDetails(details?: string): AwaitingFeedbackData {
  if (!details) return { what: "", who: "", why: "", when: "" };
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object" && "what" in parsed) return parsed;
  } catch {}
  // Legacy plain-text fallback
  return { what: details, who: "", why: "", when: "" };
}

interface TaskStatusPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  newStatus: string;
  onConfirm: (data: {
    backlogReason?: string;
    awaitingFeedbackDetails?: string;
    awaitingFeedbackFollowUpDate?: string;
    dueDateChangeReason?: string;
    newDueDate?: string;
  }) => void;
}

export function TaskStatusPromptDialog({
  open,
  onOpenChange,
  task,
  newStatus,
  onConfirm,
}: TaskStatusPromptDialogProps) {
  const parsedFeedback = parseAwaitingFeedbackDetails(task.awaitingFeedbackDetails);

  const [backlogReason, setBacklogReason] = useState(task.backlogReason || "");
  const [feedbackWhat, setFeedbackWhat] = useState(parsedFeedback.what);
  const [feedbackWho, setFeedbackWho] = useState(parsedFeedback.who);
  const [feedbackWhy, setFeedbackWhy] = useState(parsedFeedback.why);
  const [feedbackWhen, setFeedbackWhen] = useState<Date | undefined>(
    parsedFeedback.when ? new Date(parsedFeedback.when) : undefined
  );
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    task.awaitingFeedbackFollowUpDate ? new Date(task.awaitingFeedbackFollowUpDate) : undefined
  );
  const [dueDateChangeReason, setDueDateChangeReason] = useState(task.dueDateChangeReason || "");
  const [newDueDate, setNewDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );

  const getPromptTitle = () => {
    if (newStatus === "backlog") return "Moving to Backlog";
    if (newStatus === "in-progress") return "Moving to In Progress";
    if (newStatus === "review" || newStatus === "awaiting-feedback") return "Awaiting Feedback";
    return "Update Task";
  };

  const handleConfirm = () => {
    const data: any = {};

    if (newStatus === "backlog") {
      data.backlogReason = backlogReason;
    }

    if (newStatus === "review" || newStatus === "awaiting-feedback") {
      const structured: AwaitingFeedbackData = {
        what: feedbackWhat,
        who: feedbackWho,
        why: feedbackWhy,
        when: feedbackWhen ? feedbackWhen.toISOString().split("T")[0] : "",
      };
      data.awaitingFeedbackDetails = JSON.stringify(structured);
      if (followUpDate) {
        data.awaitingFeedbackFollowUpDate = followUpDate.toISOString().split("T")[0];
      }
    }

    if (newStatus === "in-progress") {
      if (newDueDate !== task.dueDate) {
        data.dueDateChangeReason = dueDateChangeReason;
      }
      data.newDueDate = newDueDate;
    }

    onConfirm(data);
    onOpenChange(false);
  };

  const canSubmit = () => {
    if (newStatus === "backlog") return backlogReason.trim() !== "";
    if (newStatus === "review" || newStatus === "awaiting-feedback") {
      return feedbackWhat.trim() !== "" && feedbackWho.trim() !== "";
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getPromptTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Task: <span className="font-medium text-foreground">{task.title}</span>
          </div>

          {/* ── Backlog ── */}
          {newStatus === "backlog" && (
            <div className="space-y-2">
              <Label htmlFor="backlog-reason">Why is this task moving to backlog? *</Label>
              <Textarea
                id="backlog-reason"
                value={backlogReason}
                onChange={(e) => setBacklogReason(e.target.value)}
                placeholder="Explain why this task is being moved to backlog..."
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* ── Awaiting Feedback ── */}
          {(newStatus === "review" || newStatus === "awaiting-feedback") && (
            <div className="space-y-4">
              {/* We're waiting on: WHAT */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-what">
                  We're waiting on <span className="text-muted-foreground font-normal">[what]</span> *
                </Label>
                <Input
                  id="feedback-what"
                  value={feedbackWhat}
                  onChange={(e) => setFeedbackWhat(e.target.value)}
                  placeholder="e.g. Approval on the revised mockups"
                />
              </div>

              {/* From: WHO */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-who">
                  From <span className="text-muted-foreground font-normal">[who]</span> *
                </Label>
                <Input
                  id="feedback-who"
                  value={feedbackWho}
                  onChange={(e) => setFeedbackWho(e.target.value)}
                  placeholder="e.g. John / Design Team / Client"
                />
              </div>

              {/* Impact: WHY */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-why">
                  Impact <span className="text-muted-foreground font-normal">[why it matters]</span>
                </Label>
                <Textarea
                  id="feedback-why"
                  value={feedbackWhy}
                  onChange={(e) => setFeedbackWhy(e.target.value)}
                  placeholder="e.g. Blocking development start"
                  className="min-h-[72px]"
                />
              </div>

              {/* Need by: WHEN */}
              <div className="space-y-1.5">
                <Label>Need by <span className="text-muted-foreground font-normal">[when]</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !feedbackWhen && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {feedbackWhen ? format(feedbackWhen, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={feedbackWhen}
                      onSelect={setFeedbackWhen}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Follow-up email */}
              <div className="border-t pt-4 space-y-1.5">
                <Label className="text-sm font-medium">Send follow-up email on</Label>
                <p className="text-xs text-muted-foreground">
                  We'll automatically email a reminder on this date if still awaiting feedback.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !followUpDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, "PPP") : "Pick a follow-up date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={() => setFollowUpDate(undefined)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Clear follow-up date
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── In Progress ── */}
          {newStatus === "in-progress" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
                {task.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Original due date: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {newDueDate !== task.dueDate && (
                <div className="space-y-2">
                  <Label htmlFor="date-change-reason">Why is the due date changing?</Label>
                  <Textarea
                    id="date-change-reason"
                    value={dueDateChangeReason}
                    onChange={(e) => setDueDateChangeReason(e.target.value)}
                    placeholder="Explain why the due date is being changed..."
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit()}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
