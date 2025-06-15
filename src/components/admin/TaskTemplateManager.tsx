
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
  Copy
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

  const handleFieldToggle = (fieldId: string) => {
    const newSelected = selectedFields.includes(fieldId)
      ? selectedFields.filter(id => id !== fieldId)
      : [...selectedFields, fieldId];
    
    setSelectedFields(newSelected);
    setTemplate({ ...template, includeCustomFields: newSelected });

    // Update field order
    if (!selectedFields.includes(fieldId)) {
      const newOrder = [...fieldOrder, fieldId];
      setFieldOrder(newOrder);
      setTemplate({ ...template, fieldOrder: newOrder });
    } else {
      const newOrder = fieldOrder.filter(id => id !== fieldId);
      setFieldOrder(newOrder);
      setTemplate({ ...template, fieldOrder: newOrder });
    }
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

export function TaskTemplateManager() {
  const { currentUser } = useAppContext();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
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

  // Fetch custom fields from Supabase
  useEffect(() => {
    fetchCustomFields();
  }, []);

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

  const handleEdit = (template: TaskTemplate) => {
    setEditingId(template.id);
    setNewTemplate(template);
  };

  const handleSaveEdit = () => {
    if (!editingId || !newTemplate.name?.trim()) return;
    
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

  const handleDelete = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({
      title: "Success",
      description: "Task template deleted successfully",
    });
  };

  const handleCreate = () => {
    if (!newTemplate.name?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }

    const template: TaskTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description || "",
      defaultPriority: newTemplate.defaultPriority || "medium",
      defaultStatus: newTemplate.defaultStatus || "todo",
      includeCustomFields: newTemplate.includeCustomFields || [],
      fieldOrder: newTemplate.fieldOrder || [],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    setTemplates(prev => [...prev, template]);
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
  };

  const handleDuplicate = (template: TaskTemplate) => {
    const duplicated: TaskTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    
    setTemplates(prev => [...prev, duplicated]);
    toast({
      title: "Success",
      description: "Task template duplicated successfully",
    });
  };

  if (loadingFields) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Task Templates
          </CardTitle>
          <CardDescription>Loading custom fields...</CardDescription>
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
              Task Templates
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
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg bg-background">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        Used {template.usageCount} times
                      </Badge>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Default Priority:</span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {template.defaultPriority}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Default Status:</span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {template.defaultStatus.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    {template.includeCustomFields.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">
                          Includes {template.includeCustomFields.length} custom field(s)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(template)}
                      title="Duplicate template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <Dialog open={editingId === template.id} onOpenChange={(open) => {
                      if (!open) handleCancelEdit();
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
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
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
