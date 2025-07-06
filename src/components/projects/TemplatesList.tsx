import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, ListChecks, Clock, ChevronDown, ChevronRight, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { ProjectTemplateWithTasks, ProjectTemplateTask, ProjectTemplateSubtask } from "@/types/projectTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditTemplateDialog } from "./EditTemplateDialog";

interface TemplatesListProps {
  onCreateTemplate: () => void;
  onUseTemplate: (templateId: string) => void;
}

export function TemplatesList({ onCreateTemplate, onUseTemplate }: TemplatesListProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProjectTemplateWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplateWithTasks | null>(null);

  useEffect(() => {
    fetchTemplatesWithTasks();
  }, []);

  const fetchTemplatesWithTasks = async () => {
    try {
      setLoading(true);
      
      // Get the authenticated user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('project_templates')
        .select('*')
        .eq('auth_user_id', user.id) // Use actual Supabase user ID
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch tasks for all templates
      const { data: tasksData, error: tasksError } = await supabase
        .from('project_template_tasks')
        .select('*')
        .eq('auth_user_id', user.id) // Use actual Supabase user ID
        .order('order_index');

      if (tasksError) throw tasksError;

      // Fetch subtasks for all tasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('project_template_subtasks')
        .select('*')
        .eq('auth_user_id', user.id) // Use actual Supabase user ID
        .order('order_index');

      if (subtasksError) throw subtasksError;

      // Organize the data
      const templatesWithTasks: ProjectTemplateWithTasks[] = templatesData.map(template => {
        const templateTasks = tasksData
          .filter(task => task.template_id === template.id)
          .map(task => {
            const taskSubtasks = subtasksData
              .filter(subtask => subtask.template_task_id === task.id)
              .map(subtask => ({
                id: subtask.id,
                templateTaskId: subtask.template_task_id,
                name: subtask.name,
                description: subtask.description || '',
                estimatedHours: subtask.estimated_hours,
                orderIndex: subtask.order_index,
                createdAt: subtask.created_at,
                updatedAt: subtask.updated_at,
              }));

            return {
              id: task.id,
              templateId: task.template_id,
              name: task.name,
              description: task.description || '',
              estimatedHours: task.estimated_hours,
              priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
              orderIndex: task.order_index,
              subtasks: taskSubtasks,
              createdAt: task.created_at,
              updatedAt: task.updated_at,
            };
          });

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          serviceType: template.service_type as 'project' | 'bank-hours' | 'pay-as-you-go',
          defaultDuration: template.default_duration,
          allocatedHours: template.allocated_hours,
          tasks: templateTasks,
          customFields: template.custom_fields,
          teamIds: template.team_ids,
          createdBy: template.auth_user_id,
          createdAt: template.created_at,
          usageCount: template.usage_count,
        };
      });

      setTemplates(templatesWithTasks);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      // Get the authenticated user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Delete the template (tasks and subtasks will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', templateId)
        .eq('auth_user_id', user.id); // Use actual Supabase user ID

      if (error) throw error;

      // Update local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));

      toast({
        title: "Success",
        description: `Template "${templateName}" has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = (template: ProjectTemplateWithTasks) => {
    setEditingTemplate(template);
  };

  const handleTemplateUpdated = () => {
    fetchTemplatesWithTasks();
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Project Templates</h2>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Project Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable project templates with predefined tasks
          </p>
        </div>
        <Button onClick={onCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUseTemplate={() => onUseTemplate(template.id)}
              onEditTemplate={() => handleEditTemplate(template)}
              onDeleteTemplate={handleDeleteTemplate}
            />
        ))}

        {/* Create new template card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center min-h-[200px]"
          onClick={onCreateTemplate}
        >
          <CardContent className="flex flex-col items-center justify-center h-full py-10">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Create Template</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-[180px]">
              Define a reusable template with predefined tasks and subtasks
            </p>
          </CardContent>
        </Card>
      </div>

      {templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[400px] mb-4">
              Create project templates with predefined tasks and subtasks to save time when starting new projects
            </p>
            <Button onClick={onCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      <EditTemplateDialog
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        onTemplateUpdated={handleTemplateUpdated}
      />
    </div>
  );
}

interface TemplateCardProps {
  template: ProjectTemplateWithTasks;
  onUseTemplate: () => void;
  onEditTemplate: () => void;
  onDeleteTemplate: (templateId: string, templateName: string) => void;
}

function TemplateCard({ template, onUseTemplate, onEditTemplate, onDeleteTemplate }: TemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalEstimatedHours = template.tasks.reduce((total, task) => {
    const taskHours = task.estimatedHours + task.subtasks.reduce((subtaskTotal, subtask) => subtaskTotal + subtask.estimatedHours, 0);
    return total + taskHours;
  }, 0);

  const totalSubtasks = template.tasks.reduce((total, task) => total + task.subtasks.length, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {template.name}
              <Badge variant="secondary" className="text-xs">
                {template.serviceType === "bank-hours" 
                  ? "Bank of Hours" 
                  : template.serviceType === "pay-as-you-go" 
                    ? "Pay As You Go" 
                    : "Fixed Project"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onUseTemplate} size="sm">
              Use Template
            </Button>
            <Button onClick={onEditTemplate} variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the template "{template.name}"? This action cannot be undone and will also delete all associated tasks and subtasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteTemplate(template.id, template.name)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span>{template.tasks.length} Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{totalSubtasks} Subtasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{totalEstimatedHours}h Estimated</span>
          </div>
          <div className="text-muted-foreground">
            Used {template.usageCount} times
          </div>
        </div>

        {template.tasks.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm font-medium">
                  {isExpanded ? 'Hide' : 'Show'} Tasks & Subtasks
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {template.tasks.map((task, index) => (
                <div key={task.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{index + 1}. {task.name}</span>
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                    <Badge variant="outline" className="text-xs">
                      {task.estimatedHours}h
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                  )}
                  {task.subtasks.length > 0 && (
                    <div className="space-y-1">
                      {task.subtasks.map((subtask, subtaskIndex) => (
                        <div key={subtask.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-4">
                          <span>•</span>
                          <span>{subtaskIndex + 1}. {subtask.name}</span>
                          {subtask.estimatedHours > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {subtask.estimatedHours}h
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Created {format(new Date(template.createdAt), "MMM d, yyyy")}
        </div>
      </CardContent>
    </Card>
  );
}
