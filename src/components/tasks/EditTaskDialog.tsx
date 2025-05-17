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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Task, User, Project, CustomField, TaskStatus } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./TaskCard";
import { TimeEntryTable } from "./TimeEntryTable";
import { CommentSection } from "./CommentSection";
import { TaskWatchButton } from "./TaskWatchButton";
import { ProjectSelect } from "./ProjectSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { CollaboratorSelect } from "@/components/tasks/CollaboratorSelect";

const taskSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  projectId: z.string().min(1, {
    message: "Please select a project.",
  }),
  assigneeId: z.string().optional(),
  collaboratorIds: z.string().array().optional(),
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
  const { users, projects, updateTask, deleteTask, moveTask, customFields, tasks } = useAppContext();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [nestedSelectedTask, setNestedSelectedTask] = useState<Task | null>(null);
  const [isNestedDialogOpen, setIsNestedDialogOpen] = useState(false);
  
  const project = projects.find(p => p.id === task.projectId);
  const assignee = task.assigneeId ? users.find(user => user.id === task.assigneeId) : null;
  const collaborators = users.filter(user => task.collaboratorIds?.includes(user.id));
  const parentTask = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
  
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      collaboratorIds: task.collaboratorIds,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      customFields: task.customFields,
    },
  });
  
  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    updateTask(task.id, {
      ...values,
      dueDate: values.dueDate?.toISOString(),
      startDate: values.startDate?.toISOString(),
    });
    onOpenChange(false);
  };
  
  const handleDeleteTask = () => {
    deleteTask(task.id);
    onOpenChange(false);
  };
  
  const handleMoveTask = (newStatus: Task["status"], newProjectId?: string) => {
    moveTask(task.id, newStatus, newProjectId);
  };
  
  const getStatusColor = () => {
    switch (task.status) {
      case 'done':
        return "bg-green-100 text-green-800";
      case 'in-progress':
        return "bg-blue-100 text-blue-800";
      case 'review':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
  
  const handleNestedTaskClick = (task: Task) => {
    setNestedSelectedTask(task);
    setIsNestedDialogOpen(true);
  };
  
  const handleNestedTaskClose = () => {
    setNestedSelectedTask(null);
    setIsNestedDialogOpen(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">Open</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[820px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>
            Make changes to your task here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex h-full">
          <div className="w-2/3 pr-4">
            <ScrollArea className="h-[calc(100vh-150px)]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Details</CardTitle>
                      <CardDescription>
                        Edit the basic information about your task
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        
                        <FormField
                          control={form.control}
                          name="collaboratorIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Collaborators</FormLabel>
                              <CollaboratorSelect 
                                users={users} 
                                selectedValues={field.value || []} 
                                onValueChange={(values) => field.onChange(values)} 
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        "w-[240px] pl-3 text-left font-normal",
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
                                    disabled={(date) =>
                                      date > new Date()
                                    }
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
                                        "w-[240px] pl-3 text-left font-normal",
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
                                    disabled={(date) =>
                                      date < new Date()
                                    }
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
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Task description"
                                  className="resize-none"
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
                      
                      {customFields.map(customField => (
                        <div key={customField.id}>
                          <FormField
                            control={form.control}
                            name={`customFields.${customField.id}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{customField.name}</FormLabel>
                                <FormControl>
                                  {customField.type === 'text' && (
                                    <Input
                                      placeholder={customField.name}
                                      {...field}
                                    />
                                  )}
                                  {customField.type === 'number' && (
                                    <Input
                                      type="number"
                                      placeholder={customField.name}
                                      {...field}
                                    />
                                  )}
                                  {customField.type === 'date' && (
                                    <Input
                                      type="date"
                                      placeholder={customField.name}
                                      {...field}
                                    />
                                  )}
                                  {customField.type === 'select' && customField.options && (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder={customField.name} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {customField.options.map(option => (
                                          <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {customField.type === 'multiselect' && customField.options && (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder={customField.name} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {customField.options.map(option => (
                                          <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </FormControl>
                                <FormDescription>
                                  {`Enter the ${customField.name} for this task.`}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete</Button>
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
                      <Button type="submit">Update task</Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
              
              <Card>
                <CardHeader>
                  <CardTitle>Subtasks</CardTitle>
                  <CardDescription>
                    Manage subtasks associated with this task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {task.subtasks.map(subtaskId => {
                      const subtask = tasks.find(t => t.id === subtaskId);
                      if (!subtask) return null;
                      
                      return (
                        <TaskCard
                          key={subtask.id}
                          task={subtask}
                          onClick={() => handleNestedTaskClick(subtask)}
                        />
                      );
                    })}
                    {task.subtasks.length === 0 && (
                      <p className="text-center py-6 text-muted-foreground">
                        No subtasks for this task
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Time Entries</CardTitle>
                  <CardDescription>
                    View and manage time entries for this task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TimeEntryTable taskId={task.id} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  <CardDescription>
                    View and add comments to this task
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommentSection taskId={task.id} />
                </CardContent>
              </Card>
            </ScrollArea>
          </div>
          
          <div className="w-1/3 pl-4">
            <Card>
              <CardHeader>
                <CardTitle>Task Info</CardTitle>
                <CardDescription>
                  Details about this task
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="outline" className={getStatusColor()}>
                    {task.status.replace(/-/g, ' ')}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <Badge variant="outline" className={getBadgeColor()}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                </div>
                
                {project && (
                  <div className="flex justify-between">
                    <span>Project:</span>
                    <Badge variant="secondary">
                      {project.name}
                    </Badge>
                  </div>
                )}
                
                {assignee && (
                  <div className="flex items-center justify-between">
                    <span>Assignee:</span>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback>{assignee.name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span>{assignee.name}</span>
                    </div>
                  </div>
                )}
                
                {collaborators.length > 0 && (
                  <div>
                    <span>Collaborators:</span>
                    <div className="flex -space-x-2 mt-1">
                      {collaborators.map(user => (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                )}
                
                {parentTask && (
                  <div className="flex justify-between">
                    <span>Parent Task:</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-800">
                      {parentTask.title.length > 15 ? `${parentTask.title.substring(0, 15)}...` : parentTask.title}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Task Actions</CardTitle>
                <CardDescription>
                  Perform actions on this task
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Move Task:</span>
                  <StatusSelect
                    onChange={(status) => handleMoveTask(status)}
                  />
                </div>
                
                <div className="flex justify-between">
                  <span>Move to Project:</span>
                  <ProjectSelect
                    onChange={(projectId) => handleMoveTask(task.status, projectId)}
                  />
                </div>
                
                <TaskWatchButton task={task} />
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
      
      {nestedSelectedTask && (
        <EditTaskDialog
          task={nestedSelectedTask}
          open={isNestedDialogOpen}
          onOpenChange={handleNestedTaskClose}
        />
      )}
    </Sheet>
  );
}
