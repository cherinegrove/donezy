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
import { CustomField, CustomFieldType, TaskStatus } from "@/types";
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
});

type TaskTemplateFormData = z.infer<typeof taskTemplateSchema>;

interface CreateTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: () => void;
}

export function CreateTaskTemplateDialog({ open, onOpenChange, onTemplateCreated }: CreateTaskTemplateDialogProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [fieldOrder, setFieldOrder] = useState<string[]>([]);

  const form = useForm<TaskTemplateFormData>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultPriority: "medium",
      defaultStatus: "todo",
      customFields: [],
      fieldOrder: [],
    },
  });

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

  const onSubmit = async (data: TaskTemplateFormData) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .insert({
          name: data.name,
          description: data.description,
          default_priority: data.defaultPriority,
          default_status: data.defaultStatus,
          include_custom_fields: data.customFields,
          field_order: data.fieldOrder,
          auth_user_id: currentUser.id,
        });

      if (error) throw error;

      toast({
        title: "Task template created",
        description: `${data.name} template has been created successfully.`,
      });

      form.reset();
      setFieldOrder([]);
      onOpenChange(false);
      onTemplateCreated?.();
    } catch (error) {
      console.error('Error creating task template:', error);
      toast({
        title: "Error",
        description: "Failed to create task template",
        variant: "destructive"
      });
    }
  };

  const selectedFields = form.watch("customFields");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task Template</DialogTitle>
          <DialogDescription>
            Create a reusable template for tasks with predefined settings and custom fields.
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
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Template</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}