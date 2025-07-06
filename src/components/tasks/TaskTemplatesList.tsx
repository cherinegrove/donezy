import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy,
  Calendar,
  Users,
  CheckSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultStatus: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
  includeCustomFields: string[];
  fieldOrder: string[];
  createdAt: string;
  usageCount: number;
}

interface TaskTemplatesListProps {
  onCreateTemplate: () => void;
  onUseTemplate?: (templateId: string) => void;
  refreshTrigger?: number;
}

export function TaskTemplatesList({ onCreateTemplate, onUseTemplate, refreshTrigger }: TaskTemplatesListProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchTemplates();
    }
  }, [currentUser, refreshTrigger]);

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
        defaultStatus: template.default_status as 'backlog' | 'todo' | 'in-progress' | 'review' | 'done',
        includeCustomFields: template.include_custom_fields || [],
        fieldOrder: template.field_order || [],
        createdAt: template.created_at,
        usageCount: template.usage_count || 0,
      }));

      setTemplates(taskTemplates);
    } catch (error) {
      console.error('Error fetching task templates:', error);
      toast({
        title: "Error",
        description: "Failed to load task templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template: TaskTemplate) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          default_priority: template.defaultPriority,
          default_status: template.defaultStatus,
          include_custom_fields: template.includeCustomFields,
          field_order: template.fieldOrder,
          auth_user_id: currentUser.id,
        });

      if (error) throw error;

      toast({
        title: "Template duplicated",
        description: `${template.name} has been duplicated successfully.`,
      });

      fetchTemplates(); // Refresh the list
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete || !currentUser) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateToDelete)
        .eq('auth_user_id', currentUser.id);

      if (error) throw error;

      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });

      fetchTemplates(); // Refresh the list
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-lg font-medium">No task templates found</p>
          <p className="text-muted-foreground text-sm text-center">
            Create your first task template to streamline task creation with predefined settings and custom fields.
          </p>
          <Button 
            variant="default" 
            className="mt-4" 
            onClick={onCreateTemplate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Task Template
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.defaultPriority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Used:</span>
                    <span className="font-medium">{template.usageCount} times</span>
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

                {onUseTemplate && (
                  <div className="pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}