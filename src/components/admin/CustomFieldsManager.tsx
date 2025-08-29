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
  Type,
  Calendar,
  ChevronDown,
  CheckSquare,
  Hash
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
import { supabase } from "@/integrations/supabase/client";
import { CustomField, CustomFieldType } from "@/types";

const fieldTypeIcons = {
  text: Type,
  date: Calendar,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  number: Hash,
};

const fieldTypeLabels = {
  text: "Text",
  date: "Date",
  dropdown: "Drop Down",
  checkbox: "Tick Box",
  number: "Number",
};

interface CustomFieldFormProps {
  newField: Partial<CustomField>;
  setNewField: (field: Partial<CustomField>) => void;
  optionsText: string;
  setOptionsText: (text: string) => void;
  isEdit?: boolean;
}

const CustomFieldForm = ({ 
  newField, 
  setNewField, 
  optionsText, 
  setOptionsText, 
  isEdit = false 
}: CustomFieldFormProps) => {
  const handleDefaultValueChange = (value: any) => {
    setNewField({ ...newField, defaultValue: value });
  };

  const renderDefaultValueInput = () => {
    if (!newField.type) return null;

    switch (newField.type) {
      case 'text':
        return (
          <Input
            value={newField.defaultValue || ""}
            onChange={(e) => handleDefaultValueChange(e.target.value)}
            placeholder="Enter default text value"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={newField.defaultValue || ""}
            onChange={(e) => handleDefaultValueChange(e.target.value ? Number(e.target.value) : "")}
            placeholder="Enter default number value"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={newField.defaultValue || ""}
            onChange={(e) => handleDefaultValueChange(e.target.value)}
          />
        );
      case 'dropdown':
        const options = optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim());
        return (
          <Select 
            value={newField.defaultValue || ""} 
            onValueChange={handleDefaultValueChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No default</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={newField.defaultValue || false}
              onCheckedChange={handleDefaultValueChange}
            />
            <Label>Default to checked</Label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="field-name">Field Name</Label>
        <Input
          id="field-name"
          value={newField.name || ""}
          onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          placeholder="Enter field name"
        />
      </div>

      <div>
        <Label htmlFor="field-type">Field Type</Label>
        <Select 
          value={newField.type} 
          onValueChange={(value: CustomFieldType) => setNewField({ ...newField, type: value, defaultValue: undefined })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(fieldTypeLabels).map(([value, label]) => {
              const Icon = fieldTypeIcons[value as CustomFieldType];
              return (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="field-description">Description (Optional)</Label>
        <Textarea
          id="field-description"
          value={newField.description || ""}
          onChange={(e) => setNewField({ ...newField, description: e.target.value })}
          placeholder="Enter field description"
          rows={2}
        />
      </div>

      <div>
        <Label>Applies To</Label>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="applies-projects"
              checked={newField.applicableTo?.includes('projects')}
              onCheckedChange={(checked) => {
                const current = newField.applicableTo || [];
                const updated = checked 
                  ? [...current.filter(item => item !== 'projects'), 'projects' as const]
                  : current.filter(item => item !== 'projects');
                setNewField({ ...newField, applicableTo: updated });
              }}
            />
            <Label htmlFor="applies-projects">Projects</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="applies-tasks"
              checked={newField.applicableTo?.includes('tasks')}
              onCheckedChange={(checked) => {
                const current = newField.applicableTo || [];
                const updated = checked 
                  ? [...current.filter(item => item !== 'tasks'), 'tasks' as const]
                  : current.filter(item => item !== 'tasks');
                setNewField({ ...newField, applicableTo: updated });
              }}
            />
            <Label htmlFor="applies-tasks">Tasks</Label>
          </div>
        </div>
      </div>

      {newField.type === 'dropdown' && (
        <div>
          <Label htmlFor="field-options">Options (one per line)</Label>
          <Textarea
            id="field-options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={4}
          />
        </div>
      )}

      <div>
        <Label>Default Value (Optional)</Label>
        <div className="mt-2">
          {renderDefaultValueInput()}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This value will be pre-filled when creating new {newField.applicableTo?.join(' and ')}.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="field-required"
            checked={newField.required}
            onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
          />
          <Label htmlFor="field-required">Required Field</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="field-reportable"
            checked={newField.reportable}
            onCheckedChange={(checked) => setNewField({ ...newField, reportable: checked })}
          />
          <Label htmlFor="field-reportable">Include in Reports</Label>
        </div>
      </div>
    </div>
  );
};

export function CustomFieldsManager() {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    name: "",
    type: "text",
    description: "",
    required: false,
    applicableTo: [],
    options: [],
    reportable: true,
  });
  const [optionsText, setOptionsText] = useState("");
  const { toast } = useToast();

  // Fetch custom fields from Supabase
  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
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
        defaultValue: field.default_value,
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
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(customFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedFields = items.map((field, index) => ({
      ...field,
      order: index
    }));

    setCustomFields(reorderedFields);

    try {
      // Update order in database
      for (const field of reorderedFields) {
        await supabase
          .from('custom_fields')
        .update({ field_order: field.order })
        .eq('id', field.id);
      }
      
      toast({
        title: "Success",
        description: "Custom fields reordered successfully",
      });
    } catch (error) {
      console.error('Error reordering fields:', error);
      toast({
        title: "Error",
        description: "Failed to reorder custom fields",
        variant: "destructive"
      });
      // Revert on error
      fetchCustomFields();
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingId(field.id);
    setNewField(field);
    setOptionsText(field.options?.join('\n') || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !newField.name?.trim()) return;
    
    try {
      const updatedField = {
        name: newField.name,
        type: newField.type,
        description: newField.description,
        required: newField.required,
        applicable_to: newField.applicableTo,
        options: newField.type === 'dropdown' 
          ? optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim())
          : null,
        reportable: newField.reportable,
        default_value: newField.defaultValue,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('custom_fields')
        .update(updatedField)
        .eq('id', editingId);

      if (error) throw error;

      await fetchCustomFields();
      setEditingId(null);
      setNewField({
        name: "",
        type: "text",
        description: "",
        required: false,
        applicableTo: [],
        options: [],
        reportable: true,
      });
      setOptionsText("");
      
      toast({
        title: "Success",
        description: "Custom field updated successfully",
      });
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: "Error",
        description: "Failed to update custom field",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewField({
      name: "",
      type: "text",
      description: "",
      required: false,
      applicableTo: [],
      options: [],
      reportable: true,
    });
    setOptionsText("");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCustomFields();
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting field:', error);
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive"
      });
    }
  };

  const handleCreate = async () => {
    if (!newField.name?.trim() || !newField.applicableTo?.length) {
      toast({
        title: "Error",
        description: "Please fill in the name and select where this field applies",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fieldToCreate = {
        auth_user_id: user.id,
        name: newField.name,
        type: newField.type,
        description: newField.description,
        required: newField.required,
        applicable_to: newField.applicableTo,
        options: newField.type === 'dropdown' 
          ? optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim())
          : null,
        reportable: newField.reportable,
        default_value: newField.defaultValue,
        field_order: customFields.length,
      };

      const { error } = await supabase
        .from('custom_fields')
        .insert(fieldToCreate);

      if (error) throw error;

      await fetchCustomFields();
      setIsCreating(false);
      setNewField({
        name: "",
        type: "text",
        description: "",
        required: false,
        applicableTo: [],
        options: [],
        reportable: true,
      });
      setOptionsText("");
      
      toast({
        title: "Success",
        description: "Custom field created successfully",
      });
    } catch (error) {
      console.error('Error creating field:', error);
      toast({
        title: "Error",
        description: "Failed to create custom field",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div>Loading custom fields...</div>
        </CardContent>
      </Card>
    );
  }

  const sortedFields = [...customFields].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Custom Fields Management</CardTitle>
            <CardDescription>
              Create and manage custom fields for projects and tasks. Drag to reorder fields.
            </CardDescription>
          </div>
          
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Custom Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Custom Field</DialogTitle>
                <DialogDescription>
                  Add a new custom field that can be used in projects and tasks.
                </DialogDescription>
              </DialogHeader>
              <CustomFieldForm 
                newField={newField}
                setNewField={setNewField}
                optionsText={optionsText}
                setOptionsText={setOptionsText}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Field</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedFields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom fields created yet.</p>
            <p className="text-sm">Create your first custom field to get started.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="custom-fields">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {sortedFields.map((field, index) => {
                    const Icon = fieldTypeIcons[field.type];
                    return (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-3 p-4 border rounded-lg bg-background"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">
                                {fieldTypeLabels[field.type]}
                              </Badge>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{field.name}</span>
                                {field.required && (
                                  <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                                {field.reportable && (
                                  <Badge variant="outline" className="text-xs">Reportable</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Applies to: {field.applicableTo.join(', ')}
                                </span>
                              </div>
                              {field.description && (
                                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                              )}
                              {field.defaultValue && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  <span className="font-medium">Default: </span>
                                  <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                                    {typeof field.defaultValue === 'boolean' 
                                      ? (field.defaultValue ? 'Yes' : 'No')
                                      : String(field.defaultValue)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Dialog open={editingId === field.id} onOpenChange={(open) => {
                                if (!open) handleCancelEdit();
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(field)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit Custom Field</DialogTitle>
                                    <DialogDescription>
                                      Update the custom field settings.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <CustomFieldForm 
                                    newField={newField}
                                    setNewField={setNewField}
                                    optionsText={optionsText}
                                    setOptionsText={setOptionsText}
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
                                onClick={() => handleDelete(field.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
        )}
      </CardContent>
    </Card>
  );
}
