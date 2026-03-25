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
import { UrgentSelect } from "./UrgentSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { CalendarIcon, Plus, Trash2, CheckCircle2, File, Link as LinkIcon, ExternalLink } from "lucide-react";
import { VoiceDescriptionButton } from "./VoiceDescriptionButton";
import { Checkbox } from "@/components/ui/checkbox";
import { RelatedTasksSection } from "./RelatedTasksSection";
import { supabase } from "@/integrations/supabase/client";
import { useNativeFieldConfigs } from "@/hooks/useNativeFieldConfigs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    estimatedHours: z.number().optional(),
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
  taskTitle?: string;
  taskDescription?: string;
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  links?: Array<{ id: string; name: string; url: string }>;
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
  const { projects, users, tasks, customFields, addTask, clients, currentUser, taskTemplates, projectStatuses } = useAppContext();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientProjects, setClientProjects] = useState<typeof projects>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [activeTab, setActiveTab] = useState("details");
  const [checklist, setChecklist] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
  const [relatedTaskIds, setRelatedTaskIds] = useState<string[]>([]);
  const [tempLinks, setTempLinks] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  
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
      estimatedHours: undefined,
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
      // Apply new template fields (task_title, task_description, checklist, links)
      // Note: DB uses snake_case, raw data is passed without transformation
      const templateData = template as any;
      
      if (templateData.task_title) {
        form.setValue("title", templateData.task_title);
      }
      if (templateData.task_description) {
        form.setValue("description", templateData.task_description);
      } else {
        form.setValue("description", template.description || "");
      }
      
      // Apply checklist from template
      if (templateData.checklist && Array.isArray(templateData.checklist)) {
        setChecklist(templateData.checklist.map((item: any) => ({
          ...item,
          id: crypto.randomUUID(), // Generate new IDs for the task
        })));
      } else {
        setChecklist([]);
      }
      
      // Apply links from template
      if (templateData.links && Array.isArray(templateData.links)) {
        setTempLinks(templateData.links.map((link: any) => ({
          ...link,
          id: crypto.randomUUID(), // Generate new IDs for the task
        })));
      } else {
        setTempLinks([]);
      }
      
      form.setValue("priority", templateData.default_priority || "medium");
      form.setValue("status", templateData.default_status || "todo");
      
      // Reset custom fields
      form.setValue("customFields", {});
      
      // Apply template's custom fields
      const customFieldsFromTemplate = templateData.include_custom_fields || templateData.customFields;
      if (selectedTemplate !== "default" && customFieldsFromTemplate && customFieldsFromTemplate.length > 0) {
        const customFieldsValue: Record<string, any> = {};
        customFieldsFromTemplate.forEach((field: any) => {
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
    
    // Filter projects by client and exclude completed projects
    const filteredProjects = projects.filter(project => {
      if (project.clientId !== clientId) return false;
      const projectStatus = projectStatuses.find(s => s.value === project.status);
      return !projectStatus?.isFinal;
    });
    setClientProjects(filteredProjects);
    
    if (clientId !== selectedClientId) {
      form.setValue("projectId", "");
      setSelectedClientId(clientId);
    }
  }, [form.watch("clientId"), projects, selectedClientId, projectStatuses]);
  
  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    
    try {
      // Check if project is completed
      const selectedProject = projects.find(p => p.id === data.projectId);
      if (selectedProject) {
        const projectStatus = projectStatuses.find(s => s.value === selectedProject.status);
        if (projectStatus?.isFinal) {
          toast.error("Cannot create tasks for completed projects");
          setIsSubmitting(false);
          return;
        }
      }

      const taskId = await addTask({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        collaboratorIds: data.collaboratorIds,
        relatedTaskIds: relatedTaskIds,
        status: data.status as TaskStatus,
        priority: data.priority as "low" | "medium" | "high",
        startDate: data.startDate,
        dueDate: data.dueDate,
        reminderDate: data.reminderDate,
        estimatedHours: data.estimatedHours,
        customFields: data.customFields || {},
        subtasks: [],
        checklist: checklist.length > 0 ? checklist : undefined,
      });

      // Add links after task is created
      if (taskId && tempLinks.length > 0 && currentUser) {
        for (const link of tempLinks) {
          await supabase.from('task_files').insert({
            task_id: taskId,
            name: link.name,
            external_url: link.url,
            is_external_link: true,
            mime_type: 'text/uri-list',
            auth_user_id: currentUser.auth_user_id,
          });
        }
      }

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
      setChecklist([]);
      setRelatedTaskIds([]);
      setTempLinks([]);
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Selection - Always at top */}
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

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4 grid grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
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

                  {!isFieldHidden('assigneeId') && (
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label>Owner {isFieldRequired('assigneeId') && '*'}</Label>
                          <AssigneeSelect field={field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="space-y-2 flex items-end pb-2">
                          <UrgentSelect field={field} />
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedHours"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="estimatedHours">Estimated Hours</Label>
                        <Input
                          id="estimatedHours"
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Enter estimated hours"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <FormMessage />
                      </div>
                    )}
                  />
                </div>

                {/* Checklist Section */}
                <div className="space-y-4 mt-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Checklist
                    </h3>
                    
                    {/* Add New Item */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Add a checklist item..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            if (input.value.trim()) {
                              setChecklist([...checklist, { id: crypto.randomUUID(), text: input.value.trim(), completed: false }]);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={(e) => {
                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                          if (input && input.value.trim()) {
                            setChecklist([...checklist, { id: crypto.randomUUID(), text: input.value.trim(), completed: false }]);
                            input.value = '';
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-2">
                      {checklist.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No checklist items yet</p>
                        </div>
                      ) : (
                        checklist.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors group"
                          >
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) => {
                                const newChecklist = [...checklist];
                                newChecklist[index].completed = checked as boolean;
                                setChecklist(newChecklist);
                              }}
                              className="mt-0.5"
                            />
                            <Input
                              value={item.text}
                              onChange={(e) => {
                                const newChecklist = [...checklist];
                                newChecklist[index].text = e.target.value;
                                setChecklist(newChecklist);
                              }}
                              className={`flex-1 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                                item.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setChecklist(checklist.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <File className="h-5 w-5" />
                      Files & Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => setIsLinkDialogOpen(true)}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Add Link
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add External Link</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="link-name">Link Name</Label>
                              <Input
                                id="link-name"
                                value={linkName}
                                onChange={(e) => setLinkName(e.target.value)}
                                placeholder="e.g., Design Mockups"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="link-url">URL</Label>
                              <Input
                                id="link-url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                type="url"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              type="button"
                              onClick={() => {
                                setIsLinkDialogOpen(false);
                                setLinkName("");
                                setLinkUrl("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="button"
                              onClick={() => {
                                if (!linkName.trim() || !linkUrl.trim()) {
                                  toast.error("Please provide both a name and URL for the link.");
                                  return;
                                }
                                const newLink = {
                                  id: `temp-${Date.now()}`,
                                  name: linkName,
                                  url: linkUrl,
                                };
                                setTempLinks([...tempLinks, newLink]);
                                setLinkName("");
                                setLinkUrl("");
                                setIsLinkDialogOpen(false);
                                toast.success(`${linkName} has been added.`);
                              }}
                            >
                              Add Link
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {tempLinks.length > 0 ? (
                      <div className="space-y-2">
                        {tempLinks.map((link) => (
                          <div 
                            key={link.id} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              const formattedUrl = link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`;
                              window.open(formattedUrl, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <ExternalLink className="h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{link.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(() => {
                                    try {
                                      return new URL(link.url).hostname;
                                    } catch {
                                      return link.url;
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    •••
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    const formattedUrl = link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`;
                                    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
                                  }}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTempLinks(tempLinks.filter(l => l.id !== link.id));
                                      toast.success("Link removed");
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No links attached to this task
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
