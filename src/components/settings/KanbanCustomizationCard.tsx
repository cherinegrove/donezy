
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Plus, X, Save, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ColorOption {
  name: string;
  value: string;
  label: string;
}

const defaultColors = [
  { name: "backlog", value: "#F3F4F6", label: "Backlog" },
  { name: "todo", value: "#DBEAFE", label: "To Do" },
  { name: "in-progress", value: "#FEF3C7", label: "In Progress" },
  { name: "review", value: "#FCE7F3", label: "Review" },
  { name: "done", value: "#DCFCE7", label: "Done" }
];

const predefinedPalettes = [
  {
    name: "Default",
    colors: {
      backlog: "#F3F4F6",
      todo: "#DBEAFE", 
      "in-progress": "#FEF3C7", 
      review: "#FCE7F3", 
      done: "#DCFCE7"
    }
  },
  {
    name: "Ocean",
    colors: {
      backlog: "#F0F9FF",
      todo: "#CFFAFE", 
      "in-progress": "#A5F3FC", 
      review: "#67E8F9", 
      done: "#0EA5E9"
    }
  },
  {
    name: "Forest",
    colors: {
      backlog: "#F0FDF4",
      todo: "#DCFCE7", 
      "in-progress": "#BBF7D0", 
      review: "#86EFAC", 
      done: "#15803D"
    }
  },
  {
    name: "Sunset",
    colors: {
      backlog: "#FFF7ED",
      todo: "#FFEDD5", 
      "in-progress": "#FED7AA", 
      review: "#FB923C", 
      done: "#EA580C"
    }
  }
];

interface CustomFieldForm {
  name: string;
  type: string;
  options: string;
  required: boolean;
}

export const KanbanCustomizationCard = () => {
  const [colors, setColors] = useState<ColorOption[]>(defaultColors);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusId, setNewStatusId] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#EAEAEA');
  const [isEditingNames, setIsEditingNames] = useState(false);
  const { toast } = useToast();
  const { customFields, addCustomField, deleteCustomField } = useAppContext();
  const [addStatusDialogOpen, setAddStatusDialogOpen] = useState(false);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [isCreatingField, setIsCreatingField] = useState(false);
  
  const [newField, setNewField] = useState<CustomFieldForm>({
    name: "",
    type: "text",
    options: "",
    required: false
  });
  
  // Load saved kanban colors on mount
  useEffect(() => {
    const savedColors = localStorage.getItem('kanbanColors');
    if (savedColors) {
      try {
        setColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error parsing kanban colors from localStorage', e);
      }
    }
  }, []);
  
  const handleColorChange = (name: string, value: string) => {
    setColors(prev => 
      prev.map(color => color.name === name ? { ...color, value } : color)
    );
  };

  const handleLabelChange = (name: string, label: string) => {
    setColors(prev => 
      prev.map(color => color.name === name ? { ...color, label } : color)
    );
  };
  
  const applyPalette = (palette: typeof predefinedPalettes[number]) => {
    const newColors = colors.map(color => ({
      ...color,
      value: palette.colors[color.name as keyof typeof palette.colors] || color.value
    }));
    
    setColors(newColors);
    toast({
      title: "Palette Applied",
      description: `${palette.name} palette has been applied to your task statuses`
    });
  };
  
  const saveChanges = () => {
    // Save to localStorage
    localStorage.setItem('kanbanColors', JSON.stringify(colors));
    
    // Apply CSS variables for the kanban colors
    colors.forEach(color => {
      document.documentElement.style.setProperty(`--kanban-${color.name}-color`, color.value);
    });
    
    toast({
      title: "Changes Saved",
      description: "Your status color customizations have been saved"
    });
  };
  
  const handleFieldChange = (key: keyof CustomFieldForm, value: string | boolean) => {
    setNewField(prev => ({ ...prev, [key]: value }));
  };
  
  const handleAddField = async () => {
    if (!newField.name.trim() || isCreatingField) {
      if (!newField.name.trim()) {
        toast({
          title: "Error",
          description: "Field name is required",
          variant: "destructive"
        });
      }
      return;
    }
    
    setIsCreatingField(true);
    
    try {
      // Parse options for dropdown type only
      const options = newField.type === 'dropdown'
        ? newField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
        : undefined;
      
      addCustomField({
        name: newField.name,
        type: newField.type as 'text' | 'number' | 'date' | 'dropdown' | 'checkbox',
        options,
        required: newField.required,
        applicableTo: ['tasks'],
        reportable: true,
        order: 0
      });
      
      // Reset form
      setNewField({
        name: "",
        type: "text",
        options: "",
        required: false
      });
      
      setAddFieldDialogOpen(false);
      
      toast({
        title: "Custom Field Added",
        description: `The field "${newField.name}" has been added`
      });
    } finally {
      setIsCreatingField(false);
    }
  };
  
  const handleDeleteField = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the field "${name}"?`)) {
      deleteCustomField(id);
      toast({
        title: "Field Deleted",
        description: `The field "${name}" has been removed`
      });
    }
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim() || !newStatusId.trim()) {
      toast({
        title: "Error",
        description: "Status name and ID are required",
        variant: "destructive"
      });
      return;
    }

    // Check if status ID already exists
    if (colors.some(color => color.name === newStatusId)) {
      toast({
        title: "Error",
        description: "Status with this ID already exists",
        variant: "destructive"
      });
      return;
    }

    const newStatus: ColorOption = {
      name: newStatusId.toLowerCase().replace(/\s+/g, '-'),
      value: newStatusColor,
      label: newStatusName
    };

    setColors(prev => [...prev, newStatus]);
    
    // Reset form
    setNewStatusName('');
    setNewStatusId('');
    setNewStatusColor('#EAEAEA');
    setAddStatusDialogOpen(false);
    
    toast({
      title: "Status Added",
      description: `The status "${newStatusName}" has been added`
    });
  };
  
  const handleDeleteStatus = (name: string) => {
    if (colors.length <= 1) {
      toast({
        title: "Error",
        description: "Cannot delete the last status",
        variant: "destructive"
      });
      return;
    }
    
    setColors(prev => prev.filter(color => color.name !== name));
    toast({
      title: "Status Deleted",
      description: "The status has been removed"
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Task Status Customization</CardTitle>
            <CardDescription>
              Customize status names, colors, and add new statuses for tasks across the application
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Management */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Task Statuses</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingNames(!isEditingNames)}
                >
                  {isEditingNames ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Done Editing
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Edit Names
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddStatusDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Status
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {colors.map(color => (
                <div key={color.name} className="space-y-2 border rounded-md p-4">
                  {isEditingNames ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={color.label}
                        onChange={(e) => handleLabelChange(color.name, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteStatus(color.name)}
                        disabled={color.name === 'todo' || color.name === 'in-progress' || color.name === 'done'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Label htmlFor={`color-${color.name}`}>{color.label}</Label>
                  )}
                  <div className="flex gap-2">
                    <div 
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: color.value }}
                    />
                    <Input
                      id={`color-${color.name}`}
                      type="text"
                      value={color.value}
                      onChange={(e) => handleColorChange(color.name, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="space-y-3">
            <Label>Color Presets</Label>
            <div className="flex flex-wrap gap-2">
              {predefinedPalettes.map(palette => (
                <Button 
                  key={palette.name}
                  variant="outline"
                  onClick={() => applyPalette(palette)}
                >
                  {palette.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button onClick={saveChanges}>Save Colors</Button>
          </div>
          
          {/* Custom Fields Section */}
          <div className="border-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Custom Fields</h3>
                <p className="text-sm text-muted-foreground">
                  Add custom fields to tasks in your kanban board
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setAddFieldDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
            
            {/* Existing Custom Fields */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-medium text-muted-foreground">Current Fields</h4>
              {customFields.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {customFields.map(field => (
                    <div key={field.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
                      <div>
                        <p className="font-medium">{field.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Type: {field.type} {field.required && " (Required)"}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteField(field.id, field.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-3 text-muted-foreground">No custom fields created yet</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Add Status Dialog */}
      <Dialog open={addStatusDialogOpen} onOpenChange={setAddStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-status-name">Display Name</Label>
                <Input
                  id="new-status-name"
                  placeholder="e.g. Waiting for Review"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-status-id">Status ID</Label>
                <Input
                  id="new-status-id"
                  placeholder="e.g. waiting-review"
                  value={newStatusId}
                  onChange={(e) => setNewStatusId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase with hyphens, no spaces
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-status-color">Color</Label>
                <div className="flex gap-2">
                  <div 
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: newStatusColor }}
                  />
                  <Input
                    id="new-status-color"
                    type="text"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStatus}>Add Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={addFieldDialogOpen} onOpenChange={setAddFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                placeholder="e.g., Story Points"
                value={newField.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => handleFieldChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newField.type === 'dropdown' && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Options (comma separated)</Label>
                <Input
                  id="field-options"
                  placeholder="Option 1, Option 2, Option 3"
                  value={newField.options}
                  onChange={(e) => handleFieldChange("options", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate options with commas
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                id="field-required"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={newField.required}
                onChange={(e) => handleFieldChange("required", e.target.checked)}
              />
              <Label htmlFor="field-required">Required Field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddField} disabled={isCreatingField}>
              {isCreatingField ? "Creating..." : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
