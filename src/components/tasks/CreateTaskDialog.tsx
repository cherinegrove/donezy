import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TaskStatus } from "@/types";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define schema for task form
const createTaskSchema = (isSubtask: boolean) => {
  const baseSchema = {
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string(),
    clientId: z.string().min(1, { message: "Client is required" }),
    projectId: z.string().min(1, { message: "Project is required" }),
    assigneeId: z.string().optional(), // Changed to single assigneeId
    collaboratorIds: z.array(z.string()), // Added collaboratorIds
    status: z.string().min(1, { message: "Status is required" }),
    priority: z.string().min(1, { message: "Priority is required" }),
    startDate: z.string().optional(), // Added start date
    dueDate: z.string().optional(),
    customFields: z.record(z.string(), z.any()),
  };

  // Make parentTaskId required for subtasks
  if (isSubtask) {
    return z.object({
      ...baseSchema,
      parentTaskId: z.string().min(1, { message: "Parent task is required for subtasks" }),
    });
  }
  
  // Make parentTaskId optional for regular tasks
  return z.object({
    ...baseSchema,
    parentTaskId: z.string().optional(),
  });
};

type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  isSubtask?: boolean;
  defaultParentTaskId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
  isSubtask = false,
  defaultParentTaskId,
}: CreateTaskDialogProps) {
  const { projects, users, tasks, customFields, addTask, clients } = useAppContext();
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientProjects, setClientProjects] = useState<typeof projects>([]);
  
  // Use the appropriate schema based on whether we're creating a subtask
  const schema = createTaskSchema(isSubtask);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      projectId: defaultProjectId || "",
      parentTaskId: defaultParentTaskId || "",
      assigneeId: "", // Changed to single assigneeId
      collaboratorIds: [], // Added collaboratorIds
      status: "todo",
      priority: "medium",
      startDate: "", // Added startDate
      dueDate: "",
      customFields: {},
    },
  });
  
  // Filter projects by selected client
  useEffect(() => {
    const clientId = form.watch("clientId");
    if (!clientId) {
      setClientProjects([]);
      return;
    }
    
    const filteredProjects = projects.filter(project => project.clientId === clientId);
    setClientProjects(filteredProjects);
    
    // Reset project selection when client changes
    if (clientId !== selectedClientId) {
      form.setValue("projectId", "");
      setSelectedClientId(clientId);
    }
  }, [form.watch("clientId"), projects, selectedClientId]);
  
  const onSubmit = (data: TaskFormData) => {
    addTask({
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      parentTaskId: data.parentTaskId,
      assigneeId: data.assigneeId, // Changed to single assigneeId
      collaboratorIds: data.collaboratorIds, // Added collaboratorIds
      status: data.status as TaskStatus,
      priority: data.priority as "low" | "medium" | "high",
      startDate: data.startDate, // Added startDate
      dueDate: data.dueDate,
      customFields: data.customFields || {},
      subtasks: [], // Added empty subtasks array
    });
    
    toast.success("Task created successfully");
    form.reset();
    onOpenChange(false);
  };
  
  // Get tasks from selected project for parent task selection
  const projectTasks = form.watch("projectId") 
    ? tasks.filter(task => task.projectId === form.watch("projectId"))
    : [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isSubtask ? "Create New Subtask" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {isSubtask ? "Create a subtask related to the parent task" : "Create a new task for your project"}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Task description" {...field} className="min-h-[80px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client Selection */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={clientProjects.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !form.watch("clientId") 
                                ? "Select a client first" 
                                : clientProjects.length === 0 
                                  ? "No projects for this client" 
                                  : "Select a project"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {clientProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="parentTaskId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isSubtask ? "Parent Task" : "Parent Task (Optional)"}</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""} 
                        onValueChange={field.onChange}
                        disabled={isSubtask && !!defaultParentTaskId || projectTasks.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !form.watch("projectId") 
                              ? "Select a project first" 
                              : isSubtask 
                                ? "Select parent task" 
                                : "No parent task"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {!isSubtask && (
                            <SelectItem key="no-parent" value="">No parent task</SelectItem>
                          )}
                          {projectTasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee (Owner)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No assignee</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <FormLabel>Collaborators</FormLabel>
                      <FormControl>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            const newCollaborators = [...field.value, value];
                            field.onChange(newCollaborators);
                            setSelectedCollaborators(newCollaborators);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Add collaborator" />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter((user) => !field.value.includes(user.id))
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((userId) => {
                            const user = users.find((u) => u.id === userId);
                            return (
                              <Button
                                key={userId}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7"
                                onClick={() => {
                                  const newCollaborators = field.value.filter((id) => id !== userId);
                                  field.onChange(newCollaborators);
                                  setSelectedCollaborators(newCollaborators);
                                }}
                              >
                                {user?.name} ✕
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="review">In Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div className="space-y-4">
                  <Label>Custom Fields</Label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.name} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        
                        {field.type === 'text' && (
                          <Input 
                            id={field.id}
                            onChange={(e) => {
                              const customFieldsValue = form.getValues("customFields");
                              form.setValue("customFields", {
                                ...customFieldsValue,
                                [field.id]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {field.type === 'number' && (
                          <Input 
                            id={field.id} 
                            type="number"
                            onChange={(e) => {
                              const customFieldsValue = form.getValues("customFields");
                              form.setValue("customFields", {
                                ...customFieldsValue,
                                [field.id]: parseFloat(e.target.value) || 0,
                              });
                            }}
                          />
                        )}
                        
                        {field.type === 'date' && (
                          <Input 
                            id={field.id} 
                            type="date"
                            onChange={(e) => {
                              const customFieldsValue = form.getValues("customFields");
                              form.setValue("customFields", {
                                ...customFieldsValue,
                                [field.id]: e.target.value,
                              });
                            }}
                          />
                        )}
                        
                        {(field.type === 'select' || field.type === 'multiselect') && field.options && (
                          <Select
                            onValueChange={(value) => {
                              const customFieldsValue = form.getValues("customFields");
                              form.setValue("customFields", {
                                ...customFieldsValue,
                                [field.id]: value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0 mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
            {isSubtask ? "Create Subtask" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
