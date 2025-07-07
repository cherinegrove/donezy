import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CustomField, CustomFieldType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from "@hello-pangea/dnd";

const taskTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  defaultPriority: z.enum(["low", "medium", "high"]).default("medium"),
  defaultStatus: z.enum(["backlog", "todo", "in-progress", "review", "done"]).default("todo"),
  customFields: z.array(z.string()).default([]),
  fieldOrder: z.array(z.string()).default([]),
  formFields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    hidden: z.boolean(),
    order: z.number(),
  })).default([]),
});

type TaskTemplateFormData = z.infer<typeof taskTemplateSchema>;

interface FormField {
  name: string;
  type: string;
  required: boolean;
  hidden: boolean;
  order: number;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultStatus: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
  includeCustomFields: string[];
  fieldOrder: string[];
  formFields?: FormField[];
}

interface EditTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TaskTemplate | null;
  onTemplateUpdated?: () => void;
}

export function EditTaskTemplateDialog({ open, onOpenChange, template, onTemplateUpdated }: EditTaskTemplateDialogProps) {
  const { toast } = useToast();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [fieldOrder, setFieldOrder] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Default task form fields
  const defaultTaskFields: FormField[] = [
    { name: 'title', type: 'text', required: true, hidden: false, order: 1 },
    { name: 'description', type: 'textarea', required: false, hidden: false, order: 2 },
    { name: 'priority', type: 'select', required: true, hidden: false, order: 3 },
    { name: 'status', type: 'select', required: true, hidden: false, order: 4 },
    { name: 'assignee', type: 'select', required: false, hidden: false, order: 5 },
    { name: 'dueDate', type: 'date', required: false, hidden: false, order: 6 },
    { name: 'estimatedHours', type: 'number', required: false, hidden: false, order: 7 },
  ];

  const form = useForm<TaskTemplateFormData>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultPriority: "medium",
      defaultStatus: "todo",
      customFields: [],
      fieldOrder: [],
      formFields: defaultTaskFields,
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (template && open) {
      const templateFormFields = template.formFields || defaultTaskFields;
      form.reset({
        name: template.name,
        description: template.description,
        defaultPriority: template.defaultPriority,
        defaultStatus: template.defaultStatus,
        customFields: template.includeCustomFields || [],
        fieldOrder: template.fieldOrder || [],
        formFields: templateFormFields,
      });
      setFieldOrder(template.fieldOrder || []);
      setFormFields(templateFormFields);
    }
  }, [template, open, form]);

  // Fetch custom fields from Supabase
  useEffect(() => {
    if (open) {
      fetchCustomFields();
    }
  }, [open]);

  // Sync fieldOrder with form state
  useEffect(() => {
    const currentFields = form.watch("customFields");
    const newOrder = fieldOrder.filter(id => currentFields.includes(id));
    const missingFields = currentFields.filter(id => !fieldOrder.includes(id));
    const updatedOrder = [...newOrder, ...missingFields];
    
    if (JSON.stringify(updatedOrder) !== JSON.stringify(fieldOrder)) {
      setFieldOrder(updatedOrder);
      form.setValue("fieldOrder", updatedOrder);
    }
  }, [form.watch("customFields")]);

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .contains('applicable_to', ['tasks'])
        .order('field_order');
      
      if (error) throw error;
      
      const fields = data.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as CustomFieldType,
        description: field.description,
        required: field.required,
        applicableTo: field.applicable_to as ('projects' | 'tasks')[],
        options: field.options,
        reportable: field.reportable,
        order: field.field_order,
        createdAt: field.created_at,
        updatedAt: field.updated_at,
      }));
      
      setCustomFields(fields);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast({
        title: "Error",
        description: "Failed to load custom fields",
        variant: "destructive"
      });
    } finally {
      setLoadingFields(false);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    const currentFields = form.getValues("customFields");
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter(id => id !== fieldId)
      : [...currentFields, fieldId];
    
    form.setValue("customFields", newFields);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fieldOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFieldOrder(items);
    form.setValue("fieldOrder", items);
  };

  const handleFormFieldDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(formFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setFormFields(updatedItems);
    form.setValue("formFields", updatedItems);
  };

  const handleFormFieldToggle = (fieldName: string, property: 'required' | 'hidden') => {
    const updatedFields = formFields.map(field => 
      field.name === fieldName 
        ? { ...field, [property]: !field[property] }
        : field
    );
    setFormFields(updatedFields);
    form.setValue("formFields", updatedFields);
  };

  const onSubmit = async (data: TaskTemplateFormData) => {
    if (!template) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .update({
          name: data.name,
          description: data.description,
          default_priority: data.defaultPriority,
          default_status: data.defaultStatus,
          include_custom_fields: data.customFields,
          field_order: data.fieldOrder,
          form_fields: data.formFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Task template updated",
        description: `${data.name} template has been updated successfully.`,
      });

      onOpenChange(false);
      onTemplateUpdated?.();
    } catch (error) {
      console.error('Error updating task template:', error);
      toast({
        title: "Error",
        description: "Failed to update task template",
        variant: "destructive"
      });
    }
  };

  const selectedFields = form.watch("customFields");

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task Template</DialogTitle>
          <DialogDescription>
            Edit the task template settings and custom fields.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter template name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Task Form Template Selection */}
            <div className="space-y-2">
              <Label>Task Form Template</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue placeholder="Select a form template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Form</SelectItem>
                  {/* TODO: Add task form templates from account settings */}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a predefined form template or use "Default Form" to configure individual fields below
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this template"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultPriority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="defaultStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* Custom Fields Selection */}
            {loadingFields ? (
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Include Custom Fields
                  </Label>
                  <p className="text-sm text-muted-foreground">Loading custom fields...</p>
                </div>
              </div>
            ) : customFields.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Include Custom Fields
                  </Label>
                  <p className="text-sm text-muted-foreground">Select which custom fields to include in this template</p>
                </div>
                
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Switch
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => handleFieldToggle(field.id)}
                      />
                      <Label htmlFor={`field-${field.id}`} className="flex-1 flex items-center gap-1">
                        {field.name}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Field Order */}
                {selectedFields.length > 0 && (
                  <div className="space-y-2">
                    <Label>Field Order</Label>
                    <p className="text-sm text-muted-foreground">Drag to reorder the custom fields</p>
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="field-order">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {fieldOrder.map((fieldId, index) => {
                              const field = customFields.find(f => f.id === fieldId);
                              if (!field) return null;
                              
                              return (
                                <Draggable key={fieldId} draggableId={fieldId} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex items-center gap-2 p-2 border rounded bg-background"
                                    >
                                      <div
                                        {...provided.dragHandleProps}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      <span className="text-sm">{field.name}</span>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Fields
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    No custom fields created yet that apply to tasks. 
                    Create custom fields in the Custom Fields Manager first.
                  </p>
                </div>
              </div>
            )}

            {/* Task Form Configuration */}
            <div className="space-y-4">
              
              <DragDropContext onDragEnd={handleFormFieldDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {formFields
                        .sort((a, b) => a.order - b.order)
                        .map((field, index) => (
                        <Draggable key={field.name} draggableId={field.name} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-3 p-3 border rounded bg-background"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium capitalize flex-1">
                                {field.name.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`${field.name}-required`}
                                    checked={field.required}
                                    onCheckedChange={() => handleFormFieldToggle(field.name, 'required')}
                                    disabled={field.name === 'title'} // Title is always required
                                  />
                                  <Label htmlFor={`${field.name}-required`} className="text-xs">
                                    Required
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`${field.name}-hidden`}
                                    checked={field.hidden}
                                    onCheckedChange={() => handleFormFieldToggle(field.name, 'hidden')}
                                    disabled={field.name === 'title'} // Title cannot be hidden
                                  />
                                  <Label htmlFor={`${field.name}-hidden`} className="text-xs">
                                    Hidden
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Template</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}