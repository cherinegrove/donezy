import React, { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useNativeFieldConfigs } from "@/hooks/useNativeFieldConfigs";
import { UrgentSelect } from "./UrgentSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { StatusSelect } from "./StatusSelect";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Trash } from "lucide-react";
import { VoiceDescriptionButton } from "./VoiceDescriptionButton";
import { ProjectSelect } from "./ProjectSelect";
import { Assignee2Select } from "./Assignee2Select";
import { CollaboratorSelect } from "./CollaboratorSelect";
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
import { TaskDetailTabs } from "./TaskDetailTabs";
import { FileSection } from "./FileSection";
import { TimerSection } from "./TimerSection";
import { ChecklistSection } from "./ChecklistSection";
import { CommentSection } from "./CommentSection";
const RelatedTasksSection = lazy(() => import("./RelatedTasksSection").then(m => ({ default: m.RelatedTasksSection })));
import { supabase } from "@/integrations/supabase/client";
import { RecurringTaskDialog } from "./RecurringTaskDialog";
import { TaskActivityLog } from "./TaskActivityLog";

import { Repeat } from "lucide-react";

interface EditTaskDialogProps {
  task: Task;
  isOpen?: boolean;          // Make isOpen optional
  onClose?: () => void;      // Make onClose optional
  open?: boolean;            // Add open prop
  onOpenChange?: (open: boolean) => void; // Add onOpenChange prop
}

export function EditTaskDialog({ task, isOpen, onClose, open, onOpenChange }: EditTaskDialogProps) {
  const { updateTask, deleteTask, users, currentUser } = useAppContext();
  const { toast } = useToast();
  const { isFieldRequired } = useNativeFieldConfigs("tasks");

  // Use either isOpen or open, with open taking precedence
  const dialogOpen = open !== undefined ? open : isOpen;
  
  // Handle both callback styles
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (onOpenChange) onOpenChange(false);
      if (onClose) onClose();
    } else if (onOpenChange) {
      onOpenChange(true);
    }
  };

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId);
  const [collaboratorIds, setCollaboratorIds] = useState(task.collaboratorIds || []);
  const [projectId, setProjectId] = useState(task.projectId);
  const [dueDate, setDueDate] = useState<string | undefined>(task.dueDate);
  const [reminderDate, setReminderDate] = useState<string | undefined>(task.reminderDate);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(task.estimatedHours);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);

  // Helper to safely parse date strings
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    try {
      // Support ISO date format (YYYY-MM-DD)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr + "T00:00:00");
        if (!isNaN(date.getTime())) return date;
      }
      // Fallback: try parsing as-is
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      console.warn('Failed to parse date:', dateStr, e);
    }
    return undefined;
  };

  // Reset form state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);
    setCollaboratorIds(task.collaboratorIds || []);
    setProjectId(task.projectId);
    setDueDate(task.dueDate);
    setReminderDate(task.reminderDate);
    setEstimatedHours(task.estimatedHours);
  }, [task]);

  const handleSaveChanges = async (additionalData?: {
    backlogReason?: string;
    awaitingFeedbackDetails?: string;
    dueDateChangeReason?: string;
    newDueDate?: string;
    customFormResponses?: {
      formId: string;
      responses: Record<string, string>;
      respondedAt: string;
    };
  }) => {
    // Honor the org's field configuration (same source as CreateTaskDialog)
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "The task title cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (isFieldRequired("description") && !description.trim()) {
      toast({
        title: "Description required",
        description: "Your organization requires a description on tasks",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      title,
      description,
      status,
      priority,
      assigneeId,
      collaboratorIds,
      projectId,
      dueDate: dueDate || undefined,
      reminderDate: reminderDate || undefined,
      estimatedHours,
    };

    // Add additional data from status prompts
    if (additionalData) {
      if (additionalData.backlogReason) {
        updates.backlogReason = additionalData.backlogReason;
      }
      if (additionalData.awaitingFeedbackDetails) {
        updates.awaitingFeedbackDetails = additionalData.awaitingFeedbackDetails;
      }
      if (additionalData.dueDateChangeReason) {
        updates.dueDateChangeReason = additionalData.dueDateChangeReason;
      }
      if (additionalData.newDueDate) {
        updates.dueDate = additionalData.newDueDate;
        setDueDate(additionalData.newDueDate);
      }
      if (additionalData.customFormResponses) {
        updates.customFormResponses = additionalData.customFormResponses;
      }
    }

    const taskId = await updateTask(task.id, updates);

    // Only send notification if assignee has been changed
    if (taskId && assigneeId && currentUser && assigneeId !== task.assigneeId) {
      const { data: notifData, error } = await supabase.functions.invoke('send-task-assignment-notification', {
        body: {
          assignedUserId: assigneeId,
          taskId,
          mentionerName: currentUser.name
        }
      });

      if (error) {
        console.error('Error calling edge function:', error);
      } else {
        console.log('Edge function called successfully:', notifData);
      }
    }

    toast({
      title: "Task Updated",
      description: "Task has been updated successfully",
    });
  };

  const handleDelete = async () => {
    const success = await deleteTask(task.id);
    setDeleteDialogOpen(false);
    
    if (success) {
      handleOpenChange(false);
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully",
        variant: "destructive",
      });
    }
  };

  const handleConvertToRecurring = () => {
    setRecurringDialogOpen(true);
  };

  const handleRecurringSuccess = async () => {
    setRecurringDialogOpen(false);
    toast({
      title: "Success",
      description: "Recurring task created successfully. You may want to delete this original task.",
    });
    handleOpenChange(false);
  };

  // Handlers for the select components with proper typing
  const handlePriorityChange = (value: string) => {
    setPriority(value as "low" | "medium" | "high" | "urgent");
  };

  const handleStatusChange = (value: string) => {
    // Directly update status - no hardcoded prompts
    setStatus(value as any);
  };


  const handleProjectChange = (value: string) => {
    setProjectId(value);
  };

  const handleAssigneeChange = (value: string | undefined) => {
    setAssigneeId(value);
  };

  const handleCollaboratorChange = (value: string[] | undefined) => {
    setCollaboratorIds(value || []);
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
          <div className="overflow-y-auto flex-1">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 grid grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="time">Time</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <VoiceDescriptionButton
                    onTranscript={(text) => setDescription(text)}
                    existingText={description}
                  />
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter task description or use the mic to dictate..."
                  rows={5}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <ProjectSelect
                    field={{ value: projectId, onChange: handleProjectChange }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <AssigneeSelect
                    field={{ value: assigneeId, onChange: handleAssigneeChange }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Collaborators</Label>
                  <CollaboratorSelect
                    field={{ value: collaboratorIds, onChange: handleCollaboratorChange }}
                  />
                </div>
                
                <div className="space-y-2 flex items-end pb-2">
                  <UrgentSelect
                    field={{ value: priority, onChange: handlePriorityChange }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {parseDate(dueDate) ? format(parseDate(dueDate)!, "PPP") : "No due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseDate(dueDate)}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setDueDate(`${year}-${month}-${day}`);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <StatusSelect
                    field={{ value: status, onChange: handleStatusChange }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reminder Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {parseDate(reminderDate) ? format(parseDate(reminderDate)!, "PPP") : "No reminder set"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseDate(reminderDate)}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setReminderDate(`${year}-${month}-${day}`);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Get an email reminder on this date
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Enter estimated hours"
                    value={estimatedHours ?? ""}
                    onChange={(e) => setEstimatedHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="space-y-6 mt-6">
                <ChecklistSection taskId={task.id} />
                <CommentSection taskId={task.id} />
                <Suspense fallback={null}>
                  <RelatedTasksSection taskId={task.id} />
                </Suspense>
              </div>
            </TabsContent>
            
            <TabsContent value="files">
              <FileSection taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="time">
              <TimerSection taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="activity">
              <TaskActivityLog
                taskId={task.id}
                currentStatus={status}
                currentBacklogReason={task.backlogReason}
                currentDueDate={task.dueDate}
                currentDueDateChangeReason={task.dueDateChangeReason}
                currentAwaitingFeedbackDetails={task.awaitingFeedbackDetails}
                customFormResponses={task.customFormResponses}
                onStatusInfoUpdated={() => {
                  // Activity was updated - the task will be refreshed by AppContext
                }}
              />
            </TabsContent>

              </Tabs>
            </div>
          </div>

          <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
            <div className="flex justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConvertToRecurring}
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Convert to Recurring
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={() => { handleSaveChanges(); handleOpenChange(false); }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task and all associated data.
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

      <RecurringTaskDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        onSuccess={handleRecurringSuccess}
        initialTask={{
          title: task.title,
          description: task.description || undefined,
          project_id: task.projectId,
          assignee_id: task.assigneeId || undefined,
          priority: task.priority,
          collaborator_ids: task.collaboratorIds || [],
          estimated_hours: task.estimatedHours || undefined,
        }}
      />

    </>
  );
}
