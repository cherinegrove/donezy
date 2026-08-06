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
import { TaskActivityLog } from "./TaskActivityLog";
import { ChecklistSection } from "./ChecklistSection";
import { CommentSection } from "./CommentSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const RelatedTasksSection = lazy(() => import("./RelatedTasksSection").then(m => ({ default: m.RelatedTasksSection })));

interface TaskSidebarPanelProps {
  task: Task;
  onClose?: () => void;
}

export function TaskSidebarPanel({ task, onClose }: TaskSidebarPanelProps) {
  const { deleteTask, updateTask, projects, users, taskStatuses } = useAppContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Editable state
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [collaboratorIds, setCollaboratorIds] = useState(task.collaboratorIds || []);

  // Safe date parsing to prevent "Invalid time value" errors
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  };

  const [dueDate, setDueDate] = useState<Date | undefined>(parseDate(task.dueDate));
  const [reminderDate, setReminderDate] = useState<Date | undefined>(parseDate(task.reminderDate));
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
      onClose?.();
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
      <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        <div className="space-y-2 pb-3 border-b">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStatuses
                    .sort((a, b) => a.order - b.order)
                    .filter((s, index, self) =>
                      index === self.findIndex(st => st.value === s.value)
                    )
                    .map((status) => (
                      <SelectItem key={status.id} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Assignee</Label>
              <Select value={assigneeId || ""} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Est. Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Hours"
                value={estimatedHours ?? ""}
                onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8 text-xs",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                    {dueDate ? format(dueDate, "MMM dd") : "Set"}
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
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Reminder</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8 text-xs",
                      !reminderDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                    {reminderDate ? format(reminderDate, "MMM dd") : "Set"}
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
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Collaborators</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left font-normal h-8"
                >
                  {collaboratorIds.length > 0
                    ? `${collaboratorIds.length} selected`
                    : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0" align="start">
                <div className="space-y-1 p-2 max-h-64 overflow-y-auto">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={collaboratorIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCollaboratorIds([...collaboratorIds, user.id]);
                          } else {
                            setCollaboratorIds(collaboratorIds.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      {user.name}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 text-xs">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
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

          <TabsContent value="activity" className="mt-4">
            <TaskActivityLog
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
        </Tabs>

      </div>

      <div className="border-t bg-background p-3 flex gap-2 flex-shrink-0">
        <Button
          onClick={handleSaveChanges}
          size="sm"
          className="flex-1"
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
