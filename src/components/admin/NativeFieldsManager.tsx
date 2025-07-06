import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NativeFieldConfig {
  id: string;
  entity_type: 'tasks' | 'projects';
  field_name: string;
  required: boolean;
  default_value: any;
  hidden: boolean;
}

const TASK_FIELDS = [
  { name: 'title', label: 'Title', type: 'text', defaultRequired: true },
  { name: 'description', label: 'Description', type: 'textarea', defaultRequired: false },
  { name: 'status', label: 'Status', type: 'select', defaultRequired: false },
  { name: 'priority', label: 'Priority', type: 'select', defaultRequired: false },
  { name: 'assigneeId', label: 'Assignee', type: 'select', defaultRequired: false },
  { name: 'dueDate', label: 'Due Date', type: 'date', defaultRequired: false },
  { name: 'estimatedHours', label: 'Estimated Hours', type: 'number', defaultRequired: false },
];

const PROJECT_FIELDS = [
  { name: 'name', label: 'Name', type: 'text', defaultRequired: true },
  { name: 'description', label: 'Description', type: 'textarea', defaultRequired: false },
  { name: 'clientId', label: 'Client', type: 'select', defaultRequired: false },
  { name: 'status', label: 'Status', type: 'select', defaultRequired: false },
  { name: 'serviceType', label: 'Service Type', type: 'select', defaultRequired: false },
  { name: 'startDate', label: 'Start Date', type: 'date', defaultRequired: false },
  { name: 'dueDate', label: 'Due Date', type: 'date', defaultRequired: false },
  { name: 'allocatedHours', label: 'Allocated Hours', type: 'number', defaultRequired: false },
];

const STATUS_OPTIONS = ['backlog', 'todo', 'in-progress', 'review', 'done'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const SERVICE_TYPE_OPTIONS = ['project', 'bank-hours', 'pay-as-you-go'];

export function NativeFieldsManager() {
  const [configs, setConfigs] = useState<NativeFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      // Check if native_field_configs table exists, if not we'll use defaults
      const { data, error } = await supabase
        .from('native_field_configs')
        .select('*');
      
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching native field configs:', error);
      // Use defaults if table doesn't exist yet
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldConfig = (entityType: 'tasks' | 'projects', fieldName: string) => {
    return configs.find(c => c.entity_type === entityType && c.field_name === fieldName);
  };

  const updateFieldConfig = async (entityType: 'tasks' | 'projects', fieldName: string, updates: Partial<NativeFieldConfig>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existingConfig = getFieldConfig(entityType, fieldName);
      
      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('native_field_configs')
          .update(updates)
          .eq('id', existingConfig.id);
        
        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('native_field_configs')
          .insert({
            auth_user_id: user.id,
            entity_type: entityType,
            field_name: fieldName,
            ...updates
          });
        
        if (error) throw error;
      }

      await fetchConfigs();
      toast({
        title: "Success",
        description: "Field configuration updated successfully"
      });
    } catch (error) {
      console.error('Error updating field config:', error);
      toast({
        title: "Error",
        description: "Failed to update field configuration",
        variant: "destructive"
      });
    }
  };

  const renderFieldConfig = (entityType: 'tasks' | 'projects', field: any) => {
    const config = getFieldConfig(entityType, field.name);
    const isRequired = config?.required ?? field.defaultRequired;
    const defaultValue = config?.default_value ?? '';
    const isHidden = config?.hidden ?? false;

    const renderDefaultValueInput = () => {
      switch (field.type) {
        case 'text':
        case 'textarea':
          return (
            <Input
              value={defaultValue || ''}
              onChange={(e) => updateFieldConfig(entityType, field.name, { default_value: e.target.value })}
              placeholder={`Default ${field.label.toLowerCase()}`}
            />
          );
        case 'number':
          return (
            <Input
              type="number"
              value={defaultValue || ''}
              onChange={(e) => updateFieldConfig(entityType, field.name, { default_value: e.target.value ? Number(e.target.value) : null })}
              placeholder={`Default ${field.label.toLowerCase()}`}
            />
          );
        case 'date':
          return (
            <Input
              type="date"
              value={defaultValue || ''}
              onChange={(e) => updateFieldConfig(entityType, field.name, { default_value: e.target.value })}
            />
          );
        case 'select':
          const options = field.name === 'status' ? STATUS_OPTIONS :
                         field.name === 'priority' ? PRIORITY_OPTIONS :
                         field.name === 'serviceType' ? SERVICE_TYPE_OPTIONS : [];
          return (
            <Select 
              value={defaultValue || ''} 
              onValueChange={(value) => updateFieldConfig(entityType, field.name, { default_value: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Default ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No default</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        default:
          return null;
      }
    };

    return (
      <div key={field.name} className="p-4 border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{field.label}</h4>
          {field.defaultRequired && (
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              System Required
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id={`${entityType}-${field.name}-required`}
              checked={isRequired}
              onCheckedChange={(checked) => updateFieldConfig(entityType, field.name, { required: checked })}
              disabled={field.defaultRequired}
            />
            <Label htmlFor={`${entityType}-${field.name}-required`}>Required</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id={`${entityType}-${field.name}-hidden`}
              checked={isHidden}
              onCheckedChange={(checked) => updateFieldConfig(entityType, field.name, { hidden: checked })}
              disabled={field.defaultRequired}
            />
            <Label htmlFor={`${entityType}-${field.name}-hidden`}>Hidden</Label>
          </div>

          <div className="space-y-2">
            <Label>Default Value</Label>
            {renderDefaultValueInput()}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div>Loading field configurations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Native Fields Configuration</CardTitle>
        <CardDescription>
          Configure default values, required status, and visibility for system fields in tasks and projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Task Fields</TabsTrigger>
            <TabsTrigger value="projects">Project Fields</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="space-y-4">
            <div className="space-y-4">
              {TASK_FIELDS.map(field => renderFieldConfig('tasks', field))}
            </div>
          </TabsContent>
          
          <TabsContent value="projects" className="space-y-4">
            <div className="space-y-4">
              {PROJECT_FIELDS.map(field => renderFieldConfig('projects', field))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}