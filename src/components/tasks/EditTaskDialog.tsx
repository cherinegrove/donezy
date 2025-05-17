
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Task } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import { ProjectSelect } from "./ProjectSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { CollaboratorSelect } from "@/components/tasks/CollaboratorSelect";
import { PrioritySelect } from "./PrioritySelect";
import { StatusSelect } from "./StatusSelect";
import { TaskDetailTabs } from "./TaskDetailTabs";

const taskSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  projectId: z.string().min(1, {
    message: "Please select a project.",
  }),
  assigneeId: z.string().optional(),
  collaboratorIds: z.array(z.string()).optional(),
  status: z.enum(["backlog", "todo", "in-progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  customFields: z.record(z.any()).optional(),
});

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const { users, projects, updateTask, deleteTask, moveTask, customFields } = useAppContext();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Critical safety check - don't proceed if task is undefined
  if (!task || typeof task !== 'object') {
    console.error("Task is undefined or invalid in EditTaskDialog");
    return null;
  }
  
  const project = projects.find(p => p.id === task.projectId);
  const assignee = task.assigneeId ? users.find(user => user.id === task.assigneeId) : null;
  
  // Ensure collaboratorIds is always a valid array
  const safeCollaboratorIds = Array.isArray(task.collaboratorIds) ? task.collaboratorIds : [];
  
  // Print warning when task.collaboratorIds is undefined or not an array
  React.useEffect(() => {
    if (!Array.isArray(task.collaboratorIds)) {
      console.warn("EditTaskDialog: task.collaboratorIds is not an array:", task.collaboratorIds);
    }
  }, [task.collaboratorIds]);
  
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title || "",
      description: task.description || "",
      projectId: task.projectId || "",
      assigneeId: task.assigneeId || "",
      collaboratorIds: safeCollaboratorIds, // Use sanitized array
      status: task.status || "todo",
      priority: task.priority || "medium",
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      customFields: task.customFields || {},
    },
  });
  
  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    // Ensure collaboratorIds is always a valid array
    const collaboratorIds = Array.isArray(values.collaboratorIds) ? values.collaboratorIds : [];
    
    updateTask(task.id, {
      ...values,
      dueDate: values.dueDate?.toISOString(),
      startDate: values.startDate?.toISOString(),
      collaboratorIds, // Use sanitized array
    });
    onOpenChange(false);
  };
  
  const handleDeleteTask = () => {
    deleteTask(task.id);
    onOpenChange(false);
  };
  
  const getBadgeColor = () => {
    switch (task.priority) {
      case 'high':
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case 'medium':
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case 'low':
        return "bg-primary/10 text-primary hover:bg-primary/20";
      default:
        return "";
    }
  };
  
  // Safely get users array with defensive check
  const safeUsers = Array.isArray(users) ? users : [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{task.title}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getBadgeColor()}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-auto pr-4 flex-grow">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <ProjectSelect field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <StatusSelect field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <AssigneeSelect field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <PrioritySelect field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The date the task is scheduled to start.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          The date the task is scheduled to be completed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="collaboratorIds"
                  render={({ field }) => {
                    // Ensure field.value is always an array
                    const safeFieldValue = Array.isArray(field.value) ? field.value : [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Collaborators</FormLabel>
                        <FormDescription>
                          Select up to 10 team members who will collaborate on this task
                        </FormDescription>
                        <CollaboratorSelect 
                          users={safeUsers} 
                          selectedValues={safeFieldValue} 
                          onValueChange={(values) => {
                            // Double ensure values is an array before setting
                            const safeValues = Array.isArray(values) ? values : [];
                            field.onChange(safeValues);
                          }} 
                          maxSelection={10}
                        />
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Task description"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Add a detailed description to your task.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          
          {/* Task Details Tabs */}
          <div className="mt-4">
            <TaskDetailTabs taskId={task.id} />
          </div>
        </div>
        
        <DialogFooter className="mt-4 sm:justify-between">
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Task</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your task from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTask}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button onClick={form.handleSubmit(onSubmit)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
