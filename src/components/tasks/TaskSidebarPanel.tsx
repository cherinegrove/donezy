import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileSection } from "./FileSection";
import { TimerSection } from "./TimerSection";
import { TaskLogsSection } from "./TaskLogsSection";
import { ChecklistSection } from "./ChecklistSection";
import { CommentSection } from "./CommentSection";
import { StatusHistorySection } from "./StatusHistorySection";
import { AssigneeSelect } from "./AssigneeSelect";
import { StatusSelect } from "./StatusSelect";
import { ProjectSelect } from "./ProjectSelect";
import { UrgentSelect } from "./UrgentSelect";
import { CollaboratorSelect } from "./CollaboratorSelect";
const RelatedTasksSection = lazy(() => import("./RelatedTasksSection").then(m => ({ default: m.RelatedTasksSection })));

interface TaskSidebarPanelProps {
  task: Task;
  onClose?: () => void;
}

export function TaskSidebarPanel({ task, onClose }: TaskSidebarPanelProps) {
  const { deleteTask, updateTask, projects, users } = useAppContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Editable state
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [collaboratorIds, setCollaboratorIds] = useState(task.collaboratorIds || []);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const [reminderDate, setReminderDate] = useState<Date | undefined>(
    task.reminderDate ? new Date(task.reminderDate) : undefined
  );
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(task.estimatedHours);

  const project = projects.find(p => p.id === task.projectId);
  const assignee = users.find(u => u.id === assigneeId);

  const handleSaveChanges = async () => {
    try {
      await updateTask(task.id, {
        description,
        status,
        priority,
        assigneeId,
        collaboratorIds,
        dueDate: dueDate ? dueDate.toISOString() : null,
        reminderDate: reminderDate ? reminderDate.toISOString() : null,
        estimatedHours,
      });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      setDeleteDialogOpen(false);
      onClose?.();
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description..."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Editable Fields */}
        <div className="space-y-4 pb-4 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
              <StatusSelect
                field={{ value: status, onChange: setStatus }}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
              <UrgentSelect
                field={{ value: priority, onChange: setPriority }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Assignee</Label>
            <AssigneeSelect
              field={{ value: assigneeId, onChange: setAssigneeId }}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Collaborators</Label>
            <CollaboratorSelect
              field={{ value: collaboratorIds, onChange: setCollaboratorIds }}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dueDate ? format(dueDate, "MMM dd, yyyy") : "Set due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Reminder Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !reminderDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {reminderDate ? format(reminderDate, "MMM dd, yyyy") : "Set reminder"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={reminderDate}
                  onSelect={setReminderDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Estimated Hours</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Enter hours"
              value={estimatedHours ?? ""}
              onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 text-xs">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <ChecklistSection taskId={task.id} />
            <CommentSection taskId={task.id} />
            <Suspense fallback={null}>
              <RelatedTasksSection taskId={task.id} />
            </Suspense>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FileSection taskId={task.id} />
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <TimerSection taskId={task.id} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <StatusHistorySection
              taskId={task.id}
              currentStatus={task.status}
              currentBacklogReason={task.backlogReason}
              currentDueDate={task.dueDate}
              currentDueDateChangeReason={task.dueDateChangeReason}
              currentAwaitingFeedbackDetails={task.awaitingFeedbackDetails}
              customFormResponses={task.customFormResponses}
              onStatusInfoUpdated={() => {}}
            />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <TaskLogsSection taskId={task.id} />
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 border-t pt-4">
          <Button
            onClick={handleSaveChanges}
            size="sm"
          >
            Save Changes
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
