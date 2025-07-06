import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NativeFieldConfig {
  id: string;
  entity_type: 'tasks' | 'projects';
  field_name: string;
  required: boolean;
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

export function NativeFieldsManager() {
  const [configs, setConfigs] = useState<NativeFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('native_field_configs')
        .select('*');
      
      if (error) throw error;
      
      setConfigs((data || []).map(item => ({
        ...item,
        entity_type: item.entity_type as 'tasks' | 'projects'
      })));
    } catch (error) {
      console.error('Error fetching native field configs:', error);
      toast({
        title: "Error",
        description: "Failed to load field configurations",
        variant: "destructive"
      });
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

  const renderFieldsTable = (entityType: 'tasks' | 'projects', fields: any[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field Name</TableHead>
            <TableHead className="text-center">Required</TableHead>
            <TableHead className="text-center">Hidden</TableHead>
            <TableHead className="text-center">System Required</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => {
            const config = getFieldConfig(entityType, field.name);
            const isRequired = config?.required ?? field.defaultRequired;
            const isHidden = config?.hidden ?? false;

            return (
              <TableRow key={field.name}>
                <TableCell className="font-medium">{field.label}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={isRequired}
                    onCheckedChange={(checked) => updateFieldConfig(entityType, field.name, { required: checked })}
                    disabled={field.defaultRequired}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={isHidden}
                    onCheckedChange={(checked) => updateFieldConfig(entityType, field.name, { hidden: checked })}
                    disabled={field.defaultRequired}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {field.defaultRequired && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                      Yes
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
          Configure required status and visibility for system fields in tasks and projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Task Fields</TabsTrigger>
            <TabsTrigger value="projects">Project Fields</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="mt-6">
            {renderFieldsTable('tasks', TASK_FIELDS)}
          </TabsContent>
          
          <TabsContent value="projects" className="mt-6">
            {renderFieldsTable('projects', PROJECT_FIELDS)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}