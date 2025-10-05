
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TaskStatus } from "@/types";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollaboratorSelect } from "./CollaboratorSelect";
import { StatusSelect } from "./StatusSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNativeFieldConfigs } from "@/hooks/useNativeFieldConfigs";

// Define schema for task form
const createTaskSchema = (fieldRequirements: { [fieldName: string]: boolean }) => {
  const baseSchema = {
    title: z.string().min(1, { message: "Title is required" }),
    description: fieldRequirements.description ? z.string().min(1, { message: "Description is required" }) : z.string(),
    clientId: z.string().min(1, { message: "Client is required" }),
    projectId: z.string().min(1, { message: "Project is required" }),
    assigneeId: fieldRequirements.assigneeId ? z.string().min(1, { message: "Assignee is required" }) : z.string().optional(),
    collaboratorIds: z.array(z.string()).optional(),
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
  includeCustomFields: string[];
  fieldOrder: string[];
  usageCount: number;
  type: 'task_template' | 'project_template_task';
  projectTemplateName?: string;
  estimatedHours?: number;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

// Correct normalizeOptions helper function for bulletproof data handling
function normalizeOptions(rawOptions: any): { label: string; value: string }[] {
  if (!Array.isArray(rawOptions)) {
    console.warn("normalizeOptions: rawOptions is not an array", rawOptions);
    return [];
  }
  
  return rawOptions
    .filter(opt => 
      opt && 
      (typeof opt === 'string' || (typeof opt === 'object' && (opt.value || opt.label)))
    )
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
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Fetch native field configurations
  const { isFieldRequired, isFieldHidden } = useNativeFieldConfigs('tasks');
  
  // Enhanced debugging for custom fields
  useEffect(() => {
    console.log('=== CUSTOM FIELDS DEBUG ===');
    console.log('AppContext customFields:', customFields);
    console.log('customFields length:', customFields.length);
    console.log('customFields details:', customFields.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      applicableTo: f.applicableTo,
      options: f.options
    })));
    console.log('currentUser:', currentUser);
    console.log('=== END DEBUG ===');
  }, [customFields, currentUser, open]);
  
  // Create field requirements object based on native field configs
  const fieldRequirements = {
    description: isFieldRequired('description'),
    assigneeId: isFieldRequired('assigneeId'),
    status: isFieldRequired('status'),
    priority: isFieldRequired('priority'),
    dueDate: isFieldRequired('dueDate'),
  };
  
  // Use the appropriate schema based on whether we're creating a subtask
  const schema = createTaskSchema(fieldRequirements);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      projectId: defaultProjectId || "",
      assigneeId: "",
      collaboratorIds: [],
      status: "todo",
      priority: "medium",
      startDate: "",
      dueDate: "",
      reminderDate: "",
      customFields: {},
    },
  });
  
  // Load templates on component mount and debug
  useEffect(() => {
    console.log('=== TASK TEMPLATES DEBUG ===');
    console.log('taskTemplates from context:', taskTemplates);
    console.log('taskTemplates length:', taskTemplates?.length || 0);
    console.log('taskTemplates details:', taskTemplates?.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type || 'unknown'
    })));
    console.log('=== END TEMPLATES DEBUG ===');
  }, [taskTemplates]);

  // Get the selected template's custom fields with enhanced debugging
  const getTemplateCustomFields = () => {
    console.log('=== getTemplateCustomFields START ===');
    console.log('selectedTemplate:', selectedTemplate);
    console.log('customFields available:', customFields.length);
    
    if (!selectedTemplate || selectedTemplate === "default") {
      console.log('Returning empty - template is default or not selected');
      return [];
    }
    
    if (customFields.length === 0) {
      console.log('Returning empty - no custom fields in context');
      return [];
    }
    
    const template = taskTemplates.find(t => t.id === selectedTemplate);
    if (!template) {
      console.log('Returning empty - template not found');
      return [];
    }
    
    if (!template.customFields || template.customFields.length === 0) {
      console.log('Returning empty - template has no custom fields');
      return [];
    }
    
    console.log('Template found:', template.name);
    console.log('Template customFields:', template.customFields);
    
    return template.customFields;
  };

  const templateCustomFields = getTemplateCustomFields();
  
  // Apply template when selected
  useEffect(() => {
    const template = taskTemplates.find(t => t.id === selectedTemplate);
    if (template) {
      console.log('Applying template:', template.name);
      form.setValue("title", "");
      form.setValue("description", template.description || "");
      form.setValue("priority", template.defaultPriority);
      form.setValue("status", template.defaultStatus);
      
      // Reset custom fields first
      form.setValue("customFields", {});
      
      // Apply template's custom fields (only for non-default templates)
      if (selectedTemplate !== "default" && template.customFields && template.customFields.length > 0) {
        console.log('Setting up custom fields for template...');
        
        const customFieldsValue: Record<string, any> = {};
        template.customFields.forEach(field => {
          console.log('Setting default value for field:', field.name, field.type);
          // Set default value based on field type
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
        
        console.log('Setting custom fields value:', customFieldsValue);
        form.setValue("customFields", customFieldsValue);
      }
    }
  }, [selectedTemplate, taskTemplates, customFields, form]);

  // Update template usage count when template is used
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
      // Note: We don't update usage count for project template tasks
    } catch (error) {
      console.error('Error updating template usage:', error);
      // Don't show error to user as this is not critical
    }
  };
  
  // Filter projects by selected client - but also allow showing all projects when no client is selected
  useEffect(() => {
    const clientId = form.watch("clientId");
    if (!clientId) {
      setClientProjects(projects); // Show all projects when no client is selected
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
  
  const onSubmit = async (data: TaskFormData) => {
    console.log('=== TASK CREATION DEBUG ===');
    console.log('Form data being submitted:', data);
    console.log('Form validation state:', form.formState);
    console.log('Form errors:', form.formState.errors);
    
    try {
      console.log('Calling addTask with data:', {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        collaboratorIds: data.collaboratorIds,
        status: data.status as TaskStatus,
        priority: data.priority as "low" | "medium" | "high",
        startDate: data.startDate,
        dueDate: data.dueDate,
        customFields: data.customFields || {},
        subtasks: [],
      });
      
      const taskId = await addTask({
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        collaboratorIds: data.collaboratorIds,
        status: data.status as TaskStatus,
        priority: data.priority as "low" | "medium" | "high",
        startDate: data.startDate,
        dueDate: data.dueDate,
        reminderDate: data.reminderDate,
        customFields: data.customFields || {},
        subtasks: [],
      });

      if (taskId && data.assigneeId) {
        const { data: notifData, error } = await supabase.functions.invoke('send-task-assignment-notification', {
          body: {
            assignedUserId: data.assigneeId,
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

      console.log('addTask completed successfully');

      // Update template usage count
      await updateTemplateUsage(selectedTemplate);

      toast.success("Task created successfully");
      form.reset();
      setSelectedTemplate("default");
      onOpenChange(false);

      console.log('Task creation process completed');
    } catch (error) {
      console.error('Error during task creation:', error);
      toast.error("Failed to create task. Please try again.");
    }
  };
  
  // Get tasks from selected project for parent task selection - allow all tasks if no project selected
  const projectTasks = form.watch("projectId") 
    ? tasks.filter(task => task.projectId === form.watch("projectId"))
    : tasks; // Show all tasks if no project is selected
  
  // Get current template
  const currentTemplate = taskTemplates.find(t => t.id === selectedTemplate);
  
  // Order fields based on template (only for non-default templates)
  const orderedFieldsToShow = currentTemplate && currentTemplate.fieldOrder && currentTemplate.fieldOrder.length > 0 && selectedTemplate !== "default"
    ? currentTemplate.fieldOrder
        .map(fieldId => templateCustomFields.find(f => f.id === fieldId))
        .filter(Boolean) as typeof templateCustomFields
    : templateCustomFields;

  console.log('Final render - orderedFieldsToShow:', orderedFieldsToShow.length);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task for your project
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4 pb-4">
              {/* Template Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Choose Template
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select a template to pre-fill task details and custom fields
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={loadingTemplates}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template"} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Default template */}
                      <SelectItem value="default">
                        <div className="flex flex-col">
                          <span>Default Template</span>
                          <span className="text-xs text-muted-foreground">Basic task form</span>
                        </div>
                      </SelectItem>
                      
                      {/* Show all available templates */}
                      {taskTemplates && taskTemplates.length > 0 && taskTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span>{template.name}</span>
                            {template.description && (
                              <span className="text-xs text-muted-foreground">
                                {template.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Show project template tasks if any exist */}
                      {taskTemplates.filter(t => t.type === 'project_template_task').length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t">
                            From Project Templates
                          </div>
                          {taskTemplates.filter(t => t.type === 'project_template_task').map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex flex-col">
                                <span>{template.name}</span>
                                {template.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {template.description}
                                  </span>
                                )}
                                <span className="text-xs text-green-600">
                                  From: {template.projectTemplateName}
                                  {template.estimatedHours && ` • ${template.estimatedHours}h`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Title */}
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
                  
                   {/* Description */}
                   {!isFieldHidden('description') && (
                     <FormField
                       control={form.control}
                       name="description"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>
                             Description
                             {isFieldRequired('description') && <span className="text-red-500 ml-1">*</span>}
                           </FormLabel>
                           <FormControl>
                             <Textarea placeholder="Task description" {...field} className="min-h-[80px]" />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No client</SelectItem>
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
                          <FormLabel>Project (Optional)</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Show all projects if no client selected, or filtered projects if client selected */}
                                {(form.watch("clientId") ? clientProjects : projects).map((project) => (
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
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {!isFieldHidden('assigneeId') && (
                       <FormField
                         control={form.control}
                         name="assigneeId"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>
                               Assignee
                               {isFieldRequired('assigneeId') && <span className="text-red-500 ml-1">*</span>}
                             </FormLabel>
                             <FormControl>
                               <Select
                                 value={field.value || ""}
                                 onValueChange={field.onChange}
                               >
                                 <SelectTrigger>
                                   <SelectValue placeholder="Select an assignee" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {!isFieldRequired('assigneeId') && <SelectItem value="">No assignee</SelectItem>}
                                   {users.map((user) => (
                                     <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
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
                     )}

                    <FormField
                      control={form.control}
                      name="collaboratorIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collaborators</FormLabel>
                          <FormControl>
                            <CollaboratorSelect field={field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Status and Priority Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {!isFieldHidden('status') && (
                       <FormField
                         control={form.control}
                         name="status"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>
                               Status
                               {isFieldRequired('status') && <span className="text-red-500 ml-1">*</span>}
                             </FormLabel>
                             <FormControl>
                               <StatusSelect 
                                 value={field.value} 
                                 onChange={field.onChange}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     )}
                    
                     {!isFieldHidden('priority') && (
                       <FormField
                         control={form.control}
                         name="priority"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>
                               Priority
                               {isFieldRequired('priority') && <span className="text-red-500 ml-1">*</span>}
                             </FormLabel>
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
                     )}
                  </div>

                  {/* Start Date and Due Date Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                     {!isFieldHidden('dueDate') && (
                       <FormField
                         control={form.control}
                         name="dueDate"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>
                               Due Date
                               {isFieldRequired('dueDate') && <span className="text-red-500 ml-1">*</span>}
                             </FormLabel>
                             <FormControl>
                               <Input type="date" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     )}
                  </div>

                  {/* Reminder Date on its own line */}
                  <FormField
                    control={form.control}
                    name="reminderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Get an email reminder on this date
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Custom Fields - Show when there are template fields available - REMOVED MultiSelect usage */}
                  {orderedFieldsToShow.length > 0 && (
                    <div className="space-y-4">
                      <Label>Custom Fields from Template</Label>
                      <p className="text-sm text-muted-foreground">
                        Fields from template: {currentTemplate?.name} ({orderedFieldsToShow.length} fields)
                      </p>
                      <div className="space-y-4">
                        {orderedFieldsToShow.map((field) => (
                          <div key={field.id} className="space-y-2">
                            {field.type === 'checkbox' ? (
                              // Checkbox field - show checkbox with label inline
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={field.id}
                                  checked={form.watch("customFields")?.[field.id] || false}
                                  onCheckedChange={(checked) => {
                                    const customFieldsValue = form.getValues("customFields");
                                    form.setValue("customFields", {
                                      ...customFieldsValue,
                                      [field.id]: checked,
                                    });
                                  }}
                                />
                                <Label 
                                  htmlFor={field.id} 
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {field.name} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                              </div>
                            ) : field.type === 'multiselect' ? (
                              // Multi-select field - Replace with simple text input for multiple comma-separated values
                              <>
                                <Label htmlFor={field.id}>
                                  {field.name} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                  id={field.id}
                                  placeholder="Enter multiple values separated by commas"
                                  value={(() => {
                                    const currentValue = form.watch("customFields")?.[field.id];
                                    return Array.isArray(currentValue) ? currentValue.join(", ") : currentValue || "";
                                  })()}
                                  onChange={(e) => {
                                    const customFieldsValue = form.getValues("customFields") || {};
                                    const values = e.target.value.split(",").map(v => v.trim()).filter(v => v);
                                    form.setValue("customFields", {
                                      ...customFieldsValue,
                                      [field.id]: values,
                                    });
                                  }}
                                />
                                {field.options && field.options.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Available options: {field.options.join(", ")}
                                  </p>
                                )}
                              </>
                            ) : (
                              // All other field types - show label above input
                              <>
                                <Label htmlFor={field.id}>
                                  {field.name} {field.required && <span className="text-red-500">*</span>}
                                </Label>
                                
                                {field.type === 'text' && (
                                  <Input 
                                    id={field.id}
                                    value={form.watch("customFields")?.[field.id] || ""}
                                    onChange={(e) => {
                                      const customFieldsValue = form.getValues("customFields");
                                      form.setValue("customFields", {
                                        ...customFieldsValue,
                                        [field.id]: e.target.value,
                                      });
                                    }}
                                  />
                                )}
                                
                                {field.type === 'textarea' && (
                                  <Textarea 
                                    id={field.id}
                                    value={form.watch("customFields")?.[field.id] || ""}
                                    onChange={(e) => {
                                      const customFieldsValue = form.getValues("customFields");
                                      form.setValue("customFields", {
                                        ...customFieldsValue,
                                        [field.id]: e.target.value,
                                      });
                                    }}
                                    className="min-h-[80px]"
                                  />
                                )}
                                
                                {field.type === 'number' && (
                                  <Input 
                                    id={field.id} 
                                    type="number"
                                    value={form.watch("customFields")?.[field.id] || ""}
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
                                    value={form.watch("customFields")?.[field.id] || ""}
                                    onChange={(e) => {
                                      const customFieldsValue = form.getValues("customFields");
                                      form.setValue("customFields", {
                                        ...customFieldsValue,
                                        [field.id]: e.target.value,
                                      });
                                    }}
                                  />
                                )}
                                
                                {(field.type === 'select' || field.type === 'dropdown') && field.options && (
                                  <Select
                                    value={form.watch("customFields")?.[field.id] || ""}
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
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-2 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
