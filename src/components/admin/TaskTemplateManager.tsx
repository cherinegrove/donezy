import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  Save, 
  X,
  FileText,
  Copy,
  Calendar,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppContext } from "@/contexts/AppContext";
import { TaskStatus, CustomField, CustomFieldType } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultStatus: TaskStatus;
  includeCustomFields: string[];
  fieldOrder: string[];
  createdAt: string;
  usageCount: number;
}

interface TaskTemplateFormProps {
  template: Partial<TaskTemplate>;
  setTemplate: (template: Partial<TaskTemplate>) => void;
  customFields: CustomField[];
  isEdit?: boolean;
}

const TaskTemplateForm = ({ 
  template, 
  setTemplate, 
  customFields,
  isEdit = false 
}: TaskTemplateFormProps) => {
  const [selectedFields, setSelectedFields] = useState<string[]>(template.includeCustomFields || []);
  const [fieldOrder, setFieldOrder] = useState<string[]>(template.fieldOrder || []);

  // Update local state when template changes - this is crucial for editing
  useEffect(() => {
    console.log('Template changed:', template);
    console.log('Template includeCustomFields:', template.includeCustomFields);
    console.log('Template fieldOrder:', template.fieldOrder);
    
    setSelectedFields(template.includeCustomFields || []);
    setFieldOrder(template.fieldOrder || []);
  }, [template.includeCustomFields, template.fieldOrder]); // Removed template.id dependency to fix new template issue

  const handleFieldToggle = (fieldId: string) => {
    const isCurrentlySelected = selectedFields.includes(fieldId);
    const newSelected = isCurrentlySelected
      ? selectedFields.filter(id => id !== fieldId)
      : [...selectedFields, fieldId];
    
    console.log('Toggling field:', fieldId, 'Currently selected:', isCurrentlySelected, 'New selection:', newSelected);
    
    setSelectedFields(newSelected);
    
    // Update field order
    let newOrder = [...fieldOrder];
    if (!isCurrentlySelected) {
      // Adding field - add to end of order if not already there
      if (!newOrder.includes(fieldId)) {
        newOrder = [...newOrder, fieldId];
      }
    } else {
      // Removing field - remove from order
      newOrder = newOrder.filter(id => id !== fieldId);
    }
    
    setFieldOrder(newOrder);
    
    // Update the parent template state
    setTemplate({ 
      ...template, 
      includeCustomFields: newSelected,
      fieldOrder: newOrder
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fieldOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFieldOrder(items);
    setTemplate({ ...template, fieldOrder: items });
  };

  const taskCustomFields = customFields.filter(field => field.applicableTo.includes('tasks'));

  console.log('Rendering TaskTemplateForm with:');
  console.log('- selectedFields:', selectedFields);
  console.log('- fieldOrder:', fieldOrder);
  console.log('- taskCustomFields:', taskCustomFields);
  console.log('- isEdit:', isEdit);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="template-name">Template Name</Label>
        <Input
          id="template-name"
          value={template.name || ""}
          onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          placeholder="Enter template name"
        />
      </div>

      <div>
        <Label htmlFor="template-description">Template Description</Label>
        <Textarea
          id="template-description"
          value={template.description || ""}
          onChange={(e) => setTemplate({ ...template, description: e.target.value })}
          placeholder="Describe this template"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="default-priority">Default Priority</Label>
          <Select 
            value={template.defaultPriority || 'medium'} 
            onValueChange={(value: 'low' | 'medium' | 'high') => setTemplate({ ...template, defaultPriority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="default-status">Default Status</Label>
          <Select 
            value={template.defaultStatus || 'todo'} 
            onValueChange={(value: TaskStatus) => setTemplate({ ...template, defaultStatus: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {taskCustomFields.length > 0 && (
        <div className="space-y-4">
          <div>
            <Label>Include Custom Fields</Label>
            <p className="text-sm text-muted-foreground">Select which custom fields to include in this template</p>
          </div>
          
          <div className="space-y-2">
            {taskCustomFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Switch
                  id={`field-${field.id}`}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => handleFieldToggle(field.id)}
                />
                <Label htmlFor={`field-${field.id}`} className="flex-1">
                  {field.name}
                  {field.required && (
                    <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>

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
                        const field = taskCustomFields.find(f => f.id === fieldId);
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
      )}

      {taskCustomFields.length === 0 && (
        <div className="space-y-4">
          <div>
            <Label>Custom Fields</Label>
            <p className="text-sm text-muted-foreground">
              No custom fields created yet that apply to tasks. 
              Create custom fields in the Custom Fields Manager first.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskTemplateCardProps {
  template: TaskTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function TaskTemplateCard({ template, onEdit, onDelete, onDuplicate }: TaskTemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {template.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {template.description}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDuplicate}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Priority:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {template.defaultPriority}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Used:</span>
              <span className="font-medium">{template.usageCount || 0} times</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Default Status:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {template.defaultStatus.replace('-', ' ')}
              </Badge>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Custom Fields:</span>
              <span className="font-medium">{template.includeCustomFields?.length || 0}</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{format(new Date(template.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskTemplateManager() {
  const { currentUser } = useAppContext();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: "",
    description: "",
    defaultPriority: "medium",
    defaultStatus: "todo",
    includeCustomFields: [],
    fieldOrder: [],
  });
  const { toast } = useToast();

  // Fetch custom fields and templates from Supabase
  useEffect(() => {
    if (currentUser) {
      fetchCustomFields();
      fetchTemplates();
    }
  }, [currentUser]);

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

  const fetchTemplates = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('auth_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const taskTemplates: TaskTemplate[] = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || "",
        defaultPriority: template.default_priority as 'low' | 'medium' | 'high',
        defaultStatus: template.default_status as TaskStatus,
        includeCustomFields: template.include_custom_fields || [],
        fieldOrder: template.field_order || [],
        createdAt: template.created_at,
        usageCount: template.usage_count,
      }));

      setTemplates(taskTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load task templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: TaskTemplate) => {
    console.log('Starting edit for template:', template);
    setEditingId(template.id);
    
    // Create a complete template object for editing with all required fields
    const editTemplate: Partial<TaskTemplate> = {
      id: template.id,
      name: template.name,
      description: template.description,
      defaultPriority: template.defaultPriority,
      defaultStatus: template.defaultStatus,
      includeCustomFields: template.includeCustomFields || [],
      fieldOrder: template.fieldOrder || [],
    };
    
    console.log('Setting edit template:', editTemplate);
    setNewTemplate(editTemplate);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !newTemplate.name?.trim() || !currentUser) return;
    
    try {
      const { error } = await supabase
        .from('task_templates')
        .update({
          name: newTemplate.name,
          description: newTemplate.description || "",
          default_priority: newTemplate.defaultPriority,
          default_status: newTemplate.defaultStatus,
          include_custom_fields: newTemplate.includeCustomFields,
          field_order: newTemplate.fieldOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .eq('auth_user_id', currentUser.id);

      if (error) throw error;

      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === editingId 
          ? { ...t, ...newTemplate, id: editingId }
          : t
      ));
      
      setEditingId(null);
      setNewTemplate({
        name: "",
        description: "",
        defaultPriority: "medium",
        defaultStatus: "todo",
        includeCustomFields: [],
        fieldOrder: [],
      });
      
      toast({
        title: "Success",
        description: "Task template updated successfully",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update task template",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTemplate({
      name: "",
      description: "",
      defaultPriority: "medium",
      defaultStatus: "todo",
      includeCustomFields: [],
      fieldOrder: [],
    });
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id)
        .eq('auth_user_id', currentUser.id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Task template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete task template",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name?.trim() || !currentUser) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          auth_user_id: currentUser.id,
          name: newTemplate.name,
          description: newTemplate.description || "",
          default_priority: newTemplate.defaultPriority || "medium",
          default_status: newTemplate.defaultStatus || "todo",
          include_custom_fields: newTemplate.includeCustomFields || [],
          field_order: newTemplate.fieldOrder || [],
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newTaskTemplate: TaskTemplate = {
        id: data.id,
        name: data.name,
        description: data.description || "",
        defaultPriority: data.default_priority as 'low' | 'medium' | 'high',
        defaultStatus: data.default_status as TaskStatus,
        includeCustomFields: data.include_custom_fields || [],
        fieldOrder: data.field_order || [],
        createdAt: data.created_at,
        usageCount: data.usage_count,
      };

      setTemplates(prev => [newTaskTemplate, ...prev]);
      setIsCreating(false);
      setNewTemplate({
        name: "",
        description: "",
        defaultPriority: "medium",
        defaultStatus: "todo",
        includeCustomFields: [],
        fieldOrder: [],
      });
      
      toast({
        title: "Success",
        description: "Task template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create task template",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (template: TaskTemplate) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          auth_user_id: currentUser.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          default_priority: template.defaultPriority,
          default_status: template.defaultStatus,
          include_custom_fields: template.includeCustomFields,
          field_order: template.fieldOrder,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const duplicatedTemplate: TaskTemplate = {
        id: data.id,
        name: data.name,
        description: data.description || "",
        defaultPriority: data.default_priority as 'low' | 'medium' | 'high',
        defaultStatus: data.default_status as TaskStatus,
        includeCustomFields: data.include_custom_fields || [],
        fieldOrder: data.field_order || [],
        createdAt: data.created_at,
        usageCount: data.usage_count,
      };

      setTemplates(prev => [duplicatedTemplate, ...prev]);
      toast({
        title: "Success",
        description: "Task template duplicated successfully",
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate task template",
        variant: "destructive"
      });
    }
  };

  if (loadingFields || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Task Create Form Template
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Task Create Form Template
            </CardTitle>
            <CardDescription>
              Create and manage task templates for consistent task creation
            </CardDescription>
          </div>
          
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Task Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Task Template</DialogTitle>
                <DialogDescription>
                  Create a new template for task creation with predefined settings and custom fields.
                </DialogDescription>
              </DialogHeader>
              <TaskTemplateForm 
                template={newTemplate}
                setTemplate={setNewTemplate}
                customFields={customFields}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No task templates created yet.</p>
            <p className="text-sm">Create your first template to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TaskTemplateCard
                key={template.id}
                template={template}
                onEdit={() => handleEdit(template)}
                onDelete={() => handleDelete(template.id)}
                onDuplicate={() => handleDuplicate(template)}
              />
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editingId !== null} onOpenChange={(open) => {
          if (!open) handleCancelEdit();
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task Template</DialogTitle>
              <DialogDescription>
                Update the task template settings and field configuration.
              </DialogDescription>
            </DialogHeader>
            <TaskTemplateForm 
              template={newTemplate}
              setTemplate={setNewTemplate}
              customFields={customFields}
              isEdit
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
