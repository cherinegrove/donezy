import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Task } from "@/types";

interface TaskStatusPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  newStatus: string;
  onConfirm: (data: { 
    backlogReason?: string; 
    awaitingFeedbackDetails?: string;
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
  const [backlogReason, setBacklogReason] = useState("");
  const [awaitingFeedbackDetails, setAwaitingFeedbackDetails] = useState("");
  const [dueDateChangeReason, setDueDateChangeReason] = useState("");
  const [newDueDate, setNewDueDate] = useState(task.dueDate || "");

  const getPromptTitle = () => {
    if (newStatus === "backlog") return "Moving to Backlog";
    if (newStatus === "in-progress") return "Moving to In Progress";
    if (newStatus === "review" || newStatus === "awaiting-feedback") return "Moving to Awaiting Feedback";
    return "Update Task";
  };

  const handleConfirm = () => {
    const data: any = {};
    
    if (newStatus === "backlog") {
      data.backlogReason = backlogReason;
    }
    
    if (newStatus === "review" || newStatus === "awaiting-feedback") {
      data.awaitingFeedbackDetails = awaitingFeedbackDetails;
    }
    
    if (newStatus === "in-progress") {
      if (newDueDate !== task.dueDate) {
        data.dueDateChangeReason = dueDateChangeReason;
      }
      data.newDueDate = newDueDate;
    }
    
    onConfirm(data);
    onOpenChange(false);
    
    // Reset form
    setBacklogReason("");
    setAwaitingFeedbackDetails("");
    setDueDateChangeReason("");
    setNewDueDate(task.dueDate || "");
  };

  const canSubmit = () => {
    if (newStatus === "backlog") return backlogReason.trim() !== "";
    if (newStatus === "review" || newStatus === "awaiting-feedback") return awaitingFeedbackDetails.trim() !== "";
    if (newStatus === "in-progress") {
      if (newDueDate !== task.dueDate) {
        return dueDateChangeReason.trim() !== "";
      }
      return true;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getPromptTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground mb-4">
            Task: <span className="font-medium text-foreground">{task.title}</span>
          </div>

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

          {(newStatus === "review" || newStatus === "awaiting-feedback") && (
            <div className="space-y-2">
              <Label htmlFor="feedback-details">What feedback are you waiting for? *</Label>
              <Textarea
                id="feedback-details"
                value={awaitingFeedbackDetails}
                onChange={(e) => setAwaitingFeedbackDetails(e.target.value)}
                placeholder="Describe what feedback or review you're waiting for..."
                className="min-h-[100px]"
              />
            </div>
          )}

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
                  <Label htmlFor="date-change-reason">Why is the due date changing? *</Label>
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