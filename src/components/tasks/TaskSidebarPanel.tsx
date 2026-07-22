import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckSquare, Trash, Repeat } from "lucide-react";
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
const RelatedTasksSection = lazy(() => import("./RelatedTasksSection").then(m => ({ default: m.RelatedTasksSection })));

interface TaskSidebarPanelProps {
  task: Task;
  onClose?: () => void;
}

export function TaskSidebarPanel({ task, onClose }: TaskSidebarPanelProps) {
  const { deleteTask } = useAppContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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
          <h2 className="text-2xl font-bold">{task.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
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
