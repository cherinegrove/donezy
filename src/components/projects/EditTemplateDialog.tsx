import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectTemplateWithTasks } from "@/types/projectTemplate";

const subtaskSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Subtask name is required"),
  description: z.string().optional(),
  estimatedHours: z.number().min(0).default(0),
  orderIndex: z.number().default(0),
});

const taskSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  estimatedHours: z.number().min(0).default(0),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  orderIndex: z.number().default(0),
  subtasks: z.array(subtaskSchema).default([]),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  defaultDuration: z.number().min(1, "Duration must be at least 1 day"),
  allocatedHours: z.number().min(0, "Hours must be 0 or greater"),
  tasks: z.array(taskSchema).default([]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EditTemplateDialogProps {
  template: ProjectTemplateWithTasks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdated: () => void;
}

export function EditTemplateDialog({ 
  template, 
  open, 
  onOpenChange,
  onTemplateUpdated
}: EditTemplateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [showTaskTemplateSelect, setShowTaskTemplateSelect] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      serviceType: "project",
      defaultDuration: 30,
      allocatedHours: 0,
      tasks: [],
    },
  });

  const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
    control: form.control,
    name: "tasks"
  });

  // Fetch task templates
  useEffect(() => {
    fetchTaskTemplates();
  }, []);

  const fetchTaskTemplates = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('auth_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description,
        serviceType: template.serviceType,
        defaultDuration: template.defaultDuration,
        allocatedHours: template.allocatedHours,
        tasks: template.tasks.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description,
          estimatedHours: task.estimatedHours,
          priority: task.priority,
          orderIndex: task.orderIndex,
          subtasks: task.subtasks.map(subtask => ({
            id: subtask.id,
            name: subtask.name,
            description: subtask.description,
            estimatedHours: subtask.estimatedHours,
            orderIndex: subtask.orderIndex,
          })),
        })),
      });
    }
  }, [template, form]);

  const addTask = () => {
    setShowTaskTemplateSelect(true);
  };

  const addTaskFromTemplate = (templateId?: string) => {
    if (templateId) {
      const template = taskTemplates.find(t => t.id === templateId);
      if (template) {
        appendTask({
          name: template.name,
          description: template.description,
          estimatedHours: 0,
          priority: template.default_priority || "medium",
          orderIndex: taskFields.length,
          subtasks: [],
        });
      }
    } else {
      // Add blank task
      appendTask({
        name: "",
        description: "",
        estimatedHours: 0,
        priority: "medium",
        orderIndex: taskFields.length,
        subtasks: [],
      });
    }
    setShowTaskTemplateSelect(false);
  };

  const addSubtask = (taskIndex: number) => {
    const currentTasks = form.getValues("tasks");
    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex].subtasks.push({
      name: "",
      description: "",
      estimatedHours: 0,
      orderIndex: updatedTasks[taskIndex].subtasks.length,
    });
    form.setValue("tasks", updatedTasks);
  };

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    const currentTasks = form.getValues("tasks");
    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex].subtasks.splice(subtaskIndex, 1);
    form.setValue("tasks", updatedTasks);
  };

  const onSubmit = async (data: TemplateFormData) => {
    if (!template) {
      toast({
        title: "Error",
        description: "No template selected for editing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Update the template
      const { error } = await supabase
        .from('project_templates')
        .update({
          name: data.name,
          description: data.description,
          service_type: data.serviceType,
          default_duration: data.defaultDuration,
          allocated_hours: data.allocatedHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id)
        .eq('auth_user_id', user.id);

      if (error) throw error;

      // Delete existing tasks and subtasks
      await supabase
        .from('project_template_tasks')
        .delete()
        .eq('template_id', template.id)
        .eq('auth_user_id', user.id);

      // Add new tasks
      if (data.tasks.length > 0) {
        const tasksToInsert = data.tasks.map((task, index) => ({
          template_id: template.id,
          name: task.name,
          description: task.description || null,
          priority: task.priority,
          estimated_hours: task.estimatedHours,
          order_index: index,
          auth_user_id: user.id
        }));

        const { data: insertedTasks, error: tasksError } = await supabase
          .from('project_template_tasks')
          .insert(tasksToInsert)
          .select('id');

        if (tasksError) throw tasksError;

        // Add subtasks for each task
        const subtasksToInsert: any[] = [];
        data.tasks.forEach((task, taskIndex) => {
          if (task.subtasks.length > 0 && insertedTasks) {
            task.subtasks.forEach((subtask, subtaskIndex) => {
              subtasksToInsert.push({
                template_task_id: insertedTasks[taskIndex].id,
                name: subtask.name,
                description: subtask.description || null,
                estimated_hours: subtask.estimatedHours,
                order_index: subtaskIndex,
                auth_user_id: user.id
              });
            });
          }
        });

        if (subtasksToInsert.length > 0) {
          const { error: subtasksError } = await supabase
            .from('project_template_subtasks')
            .insert(subtasksToInsert);

          if (subtasksError) throw subtasksError;
        }
      }

      toast({
        title: "Template updated",
        description: `Template "${data.name}" has been updated successfully.`,
      });

      onTemplateUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template details and manage tasks below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Template Info */}
            <div className="grid grid-cols-1 gap-4">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter template description" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={form.control}
                  name="defaultDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Duration (days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allocatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocated Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Tasks</h3>
                <DropdownMenu open={showTaskTemplateSelect} onOpenChange={setShowTaskTemplateSelect}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background border shadow-lg z-50">
                    <DropdownMenuItem onClick={() => addTaskFromTemplate()}>
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
                            onClick={() => addTaskFromTemplate(template.id)}
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

              {taskFields.map((task, taskIndex) => (
                <Card key={task.id} className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Task {taskIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTask(taskIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name={`tasks.${taskIndex}.name` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter task name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`tasks.${taskIndex}.description` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter task description" 
                                className="resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`tasks.${taskIndex}.priority` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`tasks.${taskIndex}.estimatedHours` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Hours</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Subtasks */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Subtasks</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSubtask(taskIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Subtask
                        </Button>
                      </div>

                      {form.watch(`tasks.${taskIndex}.subtasks` as const)?.map((subtask, subtaskIndex) => (
                        <div key={subtaskIndex} className="border rounded p-3 mb-2 bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Subtask {subtaskIndex + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubtask(taskIndex, subtaskIndex)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <FormField
                              control={form.control}
                              name={`tasks.${taskIndex}.subtasks.${subtaskIndex}.name` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Subtask name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <FormField
                                control={form.control}
                                name={`tasks.${taskIndex}.subtasks.${subtaskIndex}.description` as const}
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormControl>
                                      <Input placeholder="Description (optional)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`tasks.${taskIndex}.subtasks.${subtaskIndex}.estimatedHours` as const}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        placeholder="Hours"
                                        {...field} 
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {taskFields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tasks added yet. Click "Add Task" to get started.</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}