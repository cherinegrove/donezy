import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TaskStatus } from "@/types";
import { toast } from "sonner";
import { CollaboratorSelect } from "./CollaboratorSelect";
import { StatusSelect } from "./StatusSelect";
import { PrioritySelect } from "./PrioritySelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNativeFieldConfigs } from "@/hooks/useNativeFieldConfigs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Define schema for task form
const createTaskSchema = (fieldRequirements: { [fieldName: string]: boolean }) => {
  const baseSchema = {
    title: z.string().min(1, { message: "Title is required" }),
    description: fieldRequirements.description ? z.string().min(1, { message: "Description is required" }) : z.string(),
    clientId: z.string().min(1, { message: "Client is required" }),
    projectId: z.string().min(1, { message: "Project is required" }),
    assigneeId: fieldRequirements.assigneeId ? z.string().min(1, { message: "Assignee is required" }) : z.string().optional(),
    collaboratorIds: z.array(z.string()).optional(),
    relatedTaskIds: z.array(z.string()).optional(),
    status: fieldRequirements.status ? z.string().min(1, { message: "Status is required" }) : z.string().min(1, { message: "Status is required" }),
    priority: fieldRequirements.priority ? z.string().min(1, { message: "Priority is required" }) : z.string().min(1, { message: "Priority is required" }),
    startDate: z.string().optional(),
    dueDate: fieldRequirements.dueDate ? z.string().min(1, { message: "Due date is required" }) : z.string().optional(),
    reminderDate: z.string().optional(),
    customFields: z.record(z.string(), z.any()),
  };

  return z.object({
    ...baseSchema,
  });
};

type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>;

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultStatus: TaskStatus;
  customFields?: any[];
  fieldOrder?: string[];
  usageCount: number;
  type: 'task_template' | 'project_template_task';
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

// Normalize options helper
function normalizeOptions(rawOptions: any): { label: string; value: string }[] {
  if (!Array.isArray(rawOptions)) {
    return [];
  }
  
  return rawOptions
    .filter(opt => opt && (typeof opt === 'string' || (typeof opt === 'object' && (opt.value || opt.label))))
    .map(opt => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return {
        label: String(opt.label || opt.value || opt),
        value: String(opt.value || opt.label || opt),
      };
    });
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: CreateTaskDialogProps) {
  const { projects, users, tasks, customFields, addTask, clients, currentUser, taskTemplates } = useAppContext();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientProjects, setClientProjects] = useState<typeof projects>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [activeTab, setActiveTab] = useState("details");
  
  // Fetch native field configurations
  const { isFieldRequired, isFieldHidden } = useNativeFieldConfigs('tasks');
  
  // Create field requirements object based on native field configs
  const fieldRequirements = {
    description: isFieldRequired('description'),
    assigneeId: isFieldRequired('assigneeId'),
    status: isFieldRequired('status'),
    priority: isFieldRequired('priority'),
    dueDate: isFieldRequired('dueDate'),
  };
  
  const schema = createTaskSchema(fieldRequirements);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      projectId: defaultProjectId || "",
      assigneeId: "",
      collaboratorIds: [],
      relatedTaskIds: [],
      status: "todo",
      priority: "medium",
      startDate: "",
      dueDate: "",
      reminderDate: "",
      customFields: {},
    },
  });
  
  // Get template custom fields
  const getTemplateCustomFields = () => {
    if (!selectedTemplate || selectedTemplate === "default" || customFields.length === 0) {
      return [];
    }
    
    const template = taskTemplates.find(t => t.id === selectedTemplate);
    if (!template || !template.customFields || template.customFields.length === 0) {
      return [];
    }
    
    return template.customFields;
  };

  const templateCustomFields = getTemplateCustomFields();
  
  // Apply template when selected
  useEffect(() => {
    const template = taskTemplates.find(t => t.id === selectedTemplate);
    if (template) {
      form.setValue("description", template.description || "");
      form.setValue("priority", template.defaultPriority);
      form.setValue("status", template.defaultStatus);
      
      // Reset custom fields
      form.setValue("customFields", {});
      
      // Apply template's custom fields
      if (selectedTemplate !== "default" && template.customFields && template.customFields.length > 0) {
        const customFieldsValue: Record<string, any> = {};
        template.customFields.forEach((field: any) => {
          switch (field.type) {
            case 'text':
              customFieldsValue[field.id] = '';
              break;
            case 'number':
              customFieldsValue[field.id] = 0;
              break;
            case 'date':
              customFieldsValue[field.id] = '';
              break;
            case 'dropdown':
            case 'select':
              customFieldsValue[field.id] = '';
              break;
            default:
              customFieldsValue[field.id] = '';
          }
        });
        
        form.setValue("customFields", customFieldsValue);
      }
    }
  }, [selectedTemplate, taskTemplates, customFields, form]);

  // Update template usage count
  const updateTemplateUsage = async (templateId: string) => {
    if (templateId === "default" || !currentUser) return;

    try {
      const template = taskTemplates.find(t => t.id === templateId);
      if (template && template.type === 'task_template') {
        await supabase
          .from('task_templates')
          .update({ 
            usage_count: template.usageCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId)
          .eq('auth_user_id', currentUser.auth_user_id);
      }
    } catch (error) {
      console.error('Error updating template usage:', error);
    }
  };
  
  // Filter projects by selected client
  useEffect(() => {
    const clientId = form.watch("clientId");
    if (!clientId) {
      setClientProjects(projects);
      return;
    }
    
    const filteredProjects = projects.filter(project => project.clientId === clientId);
    setClientProjects(filteredProjects);
    
    if (clientId !== selectedClientId) {
      form.setValue("projectId", "");
      setSelectedClientId(clientId);
    }
  }, [form.watch("clientId"), projects, selectedClientId]);
  
  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    
    try {
      const taskId = await addTask({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        collaboratorIds: data.collaboratorIds,
        relatedTaskIds: data.relatedTaskIds,
        status: data.status as TaskStatus,
        priority: data.priority as "low" | "medium" | "high",
        startDate: data.startDate,
        dueDate: data.dueDate,
        reminderDate: data.reminderDate,
        customFields: data.customFields || {},
        subtasks: [],
      });

      if (taskId && data.assigneeId && currentUser) {
        const { error } = await supabase.functions.invoke('send-task-assignment-notification', {
          body: {
            assignedUserId: data.assigneeId,
            taskId,
            mentionerName: currentUser.name
          }
        });

        if (error) {
          console.error('Error calling edge function:', error);
        }
      }

      await updateTemplateUsage(selectedTemplate);

      toast.success("Task created successfully");
      form.reset();
      setSelectedTemplate("default");
      onOpenChange(false);
    } catch (error) {
      console.error('Error during task creation:', error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get tasks from selected project for related task selection
  const projectTasks = form.watch("projectId") 
    ? tasks.filter(task => task.projectId === form.watch("projectId"))
    : tasks;
  
  // Get current template
  const currentTemplate = taskTemplates.find(t => t.id === selectedTemplate);
  
  // Order fields based on template
  const orderedFieldsToShow = currentTemplate && currentTemplate.fieldOrder && currentTemplate.fieldOrder.length > 0 && selectedTemplate !== "default"
    ? currentTemplate.fieldOrder
        .map(fieldId => templateCustomFields.find((f: any) => f.id === fieldId))
        .filter(Boolean) as typeof templateCustomFields
    : templateCustomFields;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 grid grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Task Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Template</SelectItem>
                      {taskTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input id="title" placeholder="Enter task title" {...field} />
                      <FormMessage />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="description">Description {isFieldRequired('description') && '*'}</Label>
                      <Textarea id="description" placeholder="Enter task description" {...field} rows={5} />
                      <FormMessage />
                    </div>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isFieldHidden('clientId') && (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Client *</Label>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}

                  {!isFieldHidden('projectId') && (
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Project *</Label>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("clientId")}>
                            <SelectTrigger>
                              <SelectValue placeholder={form.watch("clientId") ? "Select a project" : "Select a client first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {clientProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isFieldHidden('assigneeId') && (
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Assignee {isFieldRequired('assigneeId') && '*'}</Label>
                          <AssigneeSelect field={field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}

                  {!isFieldHidden('collaboratorIds') && (
                    <FormField
                      control={form.control}
                      name="collaboratorIds"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Collaborators</Label>
                          <CollaboratorSelect field={field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isFieldHidden('priority') && (
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Priority {isFieldRequired('priority') && '*'}</Label>
                          <PrioritySelect field={field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}

                  {!isFieldHidden('status') && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Status {isFieldRequired('status') && '*'}</Label>
                          <StatusSelect field={field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isFieldHidden('dueDate') && (
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Due Date {isFieldRequired('dueDate') && '*'}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "PPP") : "No due date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}

                  {!isFieldHidden('reminderDate') && (
                    <FormField
                      control={form.control}
                      name="reminderDate"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Reminder Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "PPP") : "No reminder set"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">
                            Get an email reminder on this date
                          </p>
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Form {...form}>
              <form className="space-y-4">
                {!isFieldHidden('startDate') && (
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" {...field} />
                        <FormMessage />
                      </div>
                    )}
                  />
                )}

                {!isFieldHidden('relatedTaskIds') && (
                  <FormField
                    control={form.control}
                    name="relatedTaskIds"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Related Tasks</Label>
                        <Select
                          onValueChange={(value) => {
                            const current = field.value || [];
                            if (!current.includes(value)) {
                              field.onChange([...current, value]);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select related tasks" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectTasks.map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </div>
                    )}
                  />
                )}

                {/* Custom Fields */}
                {orderedFieldsToShow && orderedFieldsToShow.length > 0 && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium">Custom Fields</h3>
                    {orderedFieldsToShow.map((field: any) => {
                      if (!field || !field.id) {
                        return null;
                      }
                      
                      const fieldOptions = normalizeOptions(field.options || []);
                      
                      return (
                        <FormField
                          key={field.id}
                          control={form.control}
                          name={`customFields.${field.id}`}
                          render={({ field: formField }) => (
                            <div className="space-y-2">
                              <Label>{field.name} {field.required && '*'}</Label>
                              {field.type === 'text' ? (
                                <Input {...formField} placeholder={`Enter ${field.name}`} />
                              ) : field.type === 'number' ? (
                                <Input type="number" {...formField} placeholder={`Enter ${field.name}`} />
                              ) : field.type === 'date' ? (
                                <Input type="date" {...formField} />
                              ) : field.type === 'dropdown' || field.type === 'select' ? (
                                <Select onValueChange={formField.onChange} value={formField.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${field.name}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input {...formField} placeholder={`Enter ${field.name}`} />
                              )}
                              <FormMessage />
                            </div>
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setSelectedTemplate("default");
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
