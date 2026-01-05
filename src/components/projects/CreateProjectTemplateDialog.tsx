
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  defaultDuration: z.number().min(1, "Duration must be at least 1 day"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateTask {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subtasks: TemplateSubtask[];
}

interface TemplateSubtask {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
}

interface CreateProjectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectTemplateDialog({ open, onOpenChange }: CreateProjectTemplateDialogProps) {
  const { currentUser } = useAppContext();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [showTaskTemplateSelect, setShowTaskTemplateSelect] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDuration: 30,
      serviceType: "project",
    },
  });

  // Fetch task templates on mount
  useEffect(() => {
    fetchTaskTemplates();
  }, []);

  const fetchTaskTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  const addTask = (templateId?: string) => {
    if (templateId) {
      const template = taskTemplates.find(t => t.id === templateId);
      if (template) {
        const newTask: TemplateTask = {
          id: `temp-task-${Date.now()}`,
          // Use task_title if available, otherwise fall back to template name
          name: template.task_title || template.name || "",
          // Use task_description if available, otherwise fall back to description
          description: template.task_description || template.description || "",
          estimatedHours: 0,
          priority: template.default_priority || "medium",
          subtasks: [],
        };
        setTasks([...tasks, newTask]);
      }
    } else {
      const newTask: TemplateTask = {
        id: `temp-task-${Date.now()}`,
        name: "",
        description: "",
        estimatedHours: 0,
        priority: "medium",
        subtasks: [],
      };
      setTasks([...tasks, newTask]);
    }
    setShowTaskTemplateSelect(false);
  };

  const updateTask = (taskId: string, updates: Partial<TemplateTask>) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const addSubtask = (taskId: string) => {
    const newSubtask: TemplateSubtask = {
      id: `temp-subtask-${Date.now()}`,
      name: "",
      description: "",
      estimatedHours: 0,
    };
    
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, subtasks: [...task.subtasks, newSubtask] }
        : task
    ));
  };

  const updateSubtask = (taskId: string, subtaskId: string, updates: Partial<TemplateSubtask>) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? {
            ...task,
            subtasks: task.subtasks.map(subtask =>
              subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
            )
          }
        : task
    ));
  };

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId) }
        : task
    ));
  };

  const onSubmit = async (data: TemplateFormData) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a template",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // Create the project template
      const { data: template, error: templateError } = await supabase
        .from('project_templates')
        .insert({
          auth_user_id: currentUser.auth_user_id,
          name: data.name,
          description: data.description,
          service_type: data.serviceType,
          default_duration: data.defaultDuration,
          allocated_hours: 0,
          usage_count: 0,
          custom_fields: [],
          team_ids: [],
          tags: []
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template tasks and subtasks
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        const { data: createdTask, error: taskError } = await supabase
          .from('project_template_tasks')
          .insert({
            template_id: template.id,
            auth_user_id: currentUser.auth_user_id,
            name: task.name,
            description: task.description,
            estimated_hours: task.estimatedHours,
            priority: task.priority,
            order_index: i
          })
          .select()
          .single();

        if (taskError) throw taskError;

        // Create subtasks for this task
        for (let j = 0; j < task.subtasks.length; j++) {
          const subtask = task.subtasks[j];
          
          const { error: subtaskError } = await supabase
            .from('project_template_subtasks')
            .insert({
              template_task_id: createdTask.id,
              auth_user_id: currentUser.auth_user_id,
              name: subtask.name,
              description: subtask.description,
              estimated_hours: subtask.estimatedHours,
              order_index: j
            });

          if (subtaskError) throw subtaskError;
        }
      }

      toast({
        title: "Template created",
        description: `${data.name} template has been created successfully.`,
      });

      form.reset();
      setTasks([]);
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
          <DialogDescription>
            Create a reusable template with predefined tasks and subtasks for different project types.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project">Fixed Project</SelectItem>
                        <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                        <SelectItem value="pay-as-you-go">Pay As You Go</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
            
            <FormField
              control={form.control}
              name="defaultDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Duration (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Template Tasks</h3>
                <DropdownMenu open={showTaskTemplateSelect} onOpenChange={setShowTaskTemplateSelect}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => addTask()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Blank Task
                    </DropdownMenuItem>
                    {taskTemplates.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                          From Templates
                        </div>
                        {taskTemplates.map((template) => (
                          <DropdownMenuItem 
                            key={template.id}
                            onClick={() => addTask(template.id)}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{template.name}</span>
                              {template.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-full">
                                  {template.description}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {tasks.map((task, taskIndex) => (
                <Card key={task.id} className="p-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Task {taskIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Task Name</label>
                        <Input
                          placeholder="Enter task name"
                          value={task.name}
                          onChange={(e) => updateTask(task.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Priority</label>
                        <Select
                          value={task.priority}
                          onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                            updateTask(task.id, { priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="Enter task description"
                        value={task.description}
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Estimated Hours</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={task.estimatedHours}
                        onChange={(e) => updateTask(task.id, { estimatedHours: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Subtasks</label>
                        <Button
                          type="button"
                          onClick={() => addSubtask(task.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Subtask
                        </Button>
                      </div>
                      
                      {task.subtasks.map((subtask, subtaskIndex) => (
                        <div key={subtask.id} className="bg-muted/30 p-3 rounded-md space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Subtask {subtaskIndex + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubtask(task.id, subtask.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Subtask name"
                            value={subtask.name}
                            onChange={(e) => updateSubtask(task.id, subtask.id, { name: e.target.value })}
                          />
                          <Textarea
                            placeholder="Subtask description"
                            value={subtask.description}
                            onChange={(e) => updateSubtask(task.id, subtask.id, { description: e.target.value })}
                            rows={1}
                          />
                          <Input
                            type="number"
                            placeholder="Estimated hours"
                            value={subtask.estimatedHours}
                            onChange={(e) => updateSubtask(task.id, subtask.id, { estimatedHours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tasks.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No tasks added yet</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Task
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 bg-background border shadow-lg z-50">
                        <DropdownMenuItem onClick={() => addTask()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Blank Task
                        </DropdownMenuItem>
                        {taskTemplates.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                              From Templates
                            </div>
                            {taskTemplates.map((template) => (
                              <DropdownMenuItem 
                                key={template.id}
                                onClick={() => addTask(template.id)}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{template.name}</span>
                                  {template.description && (
                                    <span className="text-xs text-muted-foreground truncate max-w-full">
                                      {template.description}
                                    </span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
