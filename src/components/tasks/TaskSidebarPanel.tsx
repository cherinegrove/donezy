import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
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
  const { deleteTask, projects, users } = useAppContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const project = projects.find(p => p.id === task.projectId);
  const assignee = users.find(u => u.id === task.assigneeId);

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
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
        </div>

        {/* Key Fields */}
        <div className="space-y-4 pb-4 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
              <p className="text-sm font-medium mt-1 capitalize">{task.status}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
              <p className="text-sm font-medium mt-1 capitalize">{task.priority}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Project</Label>
              <p className="text-sm font-medium mt-1">{project?.name || "No Project"}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Assignee</Label>
              <p className="text-sm font-medium mt-1">{assignee?.name || "Unassigned"}</p>
            </div>
          </div>

          {task.dueDate && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Due Date</Label>
              <p className="text-sm font-medium mt-1">{format(parseISO(task.dueDate), "MMM dd, yyyy")}</p>
            </div>
          )}

          {task.estimatedHours && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Estimated Hours</Label>
              <p className="text-sm font-medium mt-1">{task.estimatedHours}h</p>
            </div>
          )}

          {task.collaboratorIds && task.collaboratorIds.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Collaborators</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {task.collaboratorIds.map(id => {
                  const collab = users.find(u => u.id === id);
                  return collab ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {collab.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
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
