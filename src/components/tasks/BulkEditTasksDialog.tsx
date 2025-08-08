import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Task } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { ProjectSelect } from "./ProjectSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { CollaboratorSelect } from "./CollaboratorSelect";
import { PrioritySelect } from "./PrioritySelect";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const bulkEditSchema = z.object({
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  collaboratorIds: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

interface BulkEditTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
}

export function BulkEditTasksDialog({
  open,
  onOpenChange,
  taskIds,
}: BulkEditTasksDialogProps) {
  const { tasks, updateTask } = useAppContext();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedTasks = tasks.filter(task => taskIds.includes(task.id));

  const form = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      projectId: "",
      assigneeId: "",
      collaboratorIds: [],
      priority: undefined,
    },
  });

  const onSubmit = async (data: BulkEditFormData) => {
    setIsUpdating(true);
    
    try {
      const updates: Partial<Task> = {};
      
      // Only include fields that have values
      if (data.projectId) updates.projectId = data.projectId;
      if (data.assigneeId) updates.assigneeId = data.assigneeId;
      if (data.collaboratorIds && data.collaboratorIds.length > 0) {
        updates.collaboratorIds = data.collaboratorIds;
      }
      if (data.priority) updates.priority = data.priority;

      // Update each selected task
      for (const taskId of taskIds) {
        await updateTask(taskId, updates);
      }

      toast({
        title: "Tasks updated successfully",
        description: `Updated ${taskIds.length} task${taskIds.length > 1 ? 's' : ''}`,
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error updating tasks",
        description: "An error occurred while updating the tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Tasks</DialogTitle>
          <DialogDescription>
            Edit multiple tasks at once. Only the fields you select will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Selected Tasks ({selectedTasks.length})</h4>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selectedTasks.map((task) => (
              <Badge key={task.id} variant="secondary" className="text-xs">
                {task.title}
              </Badge>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProjectSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </div>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <AssigneeSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </div>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collaboratorIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collaborators (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <CollaboratorSelect
                          field={{
                            value: field.value || [],
                            onChange: field.onChange
                          }}
                        />
                      </div>
                      {field.value && field.value.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange([])}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <PrioritySelect
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </div>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange(undefined)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : `Update ${taskIds.length} Tasks`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}