import { useState } from "react";
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
  Type,
  Calendar,
  ChevronDown,
  CheckSquare,
  Hash,
  List
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
import { CustomField, CustomFieldType } from "@/types";

const fieldTypeIcons = {
  text: Type,
  date: Calendar,
  dropdown: ChevronDown,
  multiselect: List,
  checkbox: CheckSquare,
  number: Hash,
};

const fieldTypeLabels = {
  text: "Text",
  date: "Date",
  dropdown: "Drop Down",
  multiselect: "Multi Select",
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
}: CustomFieldFormProps) => (
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
        onValueChange={(value: CustomFieldType) => setNewField({ ...newField, type: value })}
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

    {(newField.type === 'dropdown' || newField.type === 'multiselect') && (
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

export function CustomFieldsManager() {
  const { 
    customFields, 
    addCustomField, 
    updateCustomField, 
    deleteCustomField, 
    reorderCustomFields 
  } = useAppContext();
  
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(customFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedFields = items.map((field, index) => ({
      ...field,
      order: index
    }));

    reorderCustomFields(reorderedFields);
    toast({
      title: "Success",
      description: "Custom fields reordered successfully",
    });
  };

  const handleEdit = (field: CustomField) => {
    setEditingId(field.id);
    setNewField(field);
    setOptionsText(field.options?.join('\n') || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !newField.name?.trim()) return;
    
    const updatedField = {
      ...newField,
      options: newField.type === 'dropdown' || newField.type === 'multiselect' 
        ? optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim())
        : undefined
    };

    updateCustomField(editingId, updatedField);
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

  const handleDelete = (id: string) => {
    deleteCustomField(id);
    toast({
      title: "Success",
      description: "Custom field deleted successfully",
    });
  };

  const handleCreate = () => {
    if (!newField.name?.trim() || !newField.applicableTo?.length) {
      toast({
        title: "Error",
        description: "Please fill in the name and select where this field applies",
        variant: "destructive"
      });
      return;
    }

    const fieldToCreate = {
      ...newField,
      options: newField.type === 'dropdown' || newField.type === 'multiselect' 
        ? optionsText.split('\n').filter(opt => opt.trim()).map(opt => opt.trim())
        : undefined,
      order: customFields.length,
    } as Omit<CustomField, 'id' | 'createdAt' | 'updatedAt'>;

    addCustomField(fieldToCreate);
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
  };

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
