import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { TemplateTask } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  defaultDuration: z.number().min(1, "Default duration is required"),
  allocatedHours: z.number().min(0, "Allocated hours must be positive"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const { addProjectTemplate, currentUser } = useAppContext();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      serviceType: "project",
      defaultDuration: 30,
      allocatedHours: 0,
    },
  });

  const addTask = () => {
    const newTask: TemplateTask = {
      title: "",
      description: "",
      priority: "medium",
      estimatedHours: 0,
      subtasks: [],
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    const updatedTasks = [...tasks];
    (updatedTasks[index] as any)[field] = value;
    setTasks(updatedTasks);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const addSubtask = (taskIndex: number) => {
    const updatedTasks = [...tasks];
    if (!updatedTasks[taskIndex].subtasks) {
      updatedTasks[taskIndex].subtasks = [];
    }
    updatedTasks[taskIndex].subtasks!.push({
      title: "",
      description: "",
      priority: "medium",
      estimatedHours: 0,
    });
    setTasks(updatedTasks);
  };

  const updateSubtask = (taskIndex: number, subtaskIndex: number, field: keyof TemplateTask, value: any) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[taskIndex].subtasks) {
      (updatedTasks[taskIndex].subtasks![subtaskIndex] as any)[field] = value;
      setTasks(updatedTasks);
    }
  };

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[taskIndex].subtasks) {
      updatedTasks[taskIndex].subtasks = updatedTasks[taskIndex].subtasks!.filter((_, i) => i !== subtaskIndex);
      setTasks(updatedTasks);
    }
  };

  const onSubmit = (data: TemplateFormData) => {
    if (!currentUser) return;

    addProjectTemplate({
      ...data,
      tasks,
      createdBy: currentUser.id,
      teamIds: [],
    });

    toast({
      title: "Template created",
      description: `${data.name} template has been created successfully.`,
    });

    form.reset();
    setTasks([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
          <DialogDescription>
            Create a reusable template for future projects.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Template name" {...field} />
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
                      placeholder="Template description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                        <SelectItem value="pay-as-you-go">Pay as you go</SelectItem>
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
                        placeholder="Default duration in days"
                        {...field}
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
                        placeholder="Allocated hours"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tasks</h3>
              {tasks.map((task, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Task {index + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <FormField
                      control={form.control}
                      name={`tasks[${index}].title`}
                      render={() => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Task title"
                              value={task.title}
                              onChange={(e) => updateTask(index, "title", e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`tasks[${index}].description`}
                      render={() => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Task description"
                              className="resize-none"
                              value={task.description}
                              onChange={(e) => updateTask(index, "description", e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`tasks[${index}].priority`}
                      render={() => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            value={task.priority}
                            onValueChange={(value) => updateTask(index, "priority", value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`tasks[${index}].estimatedHours`}
                      render={() => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Estimated hours"
                              value={task.estimatedHours}
                              onChange={(e) => updateTask(index, "estimatedHours", parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Subtasks</h4>
                      {task.subtasks && task.subtasks.map((subtask, subtaskIndex) => (
                        <div key={subtaskIndex} className="border rounded-md p-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium">Subtask {subtaskIndex + 1}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubtask(index, subtaskIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`tasks[${index}].subtasks[${subtaskIndex}].title`}
                            render={() => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Subtask title"
                                    value={subtask.title}
                                    onChange={(e) => updateSubtask(index, subtaskIndex, "title", e.target.value)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`tasks[${index}].subtasks[${subtaskIndex}].description`}
                            render={() => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Subtask description"
                                    className="resize-none"
                                    value={subtask.description}
                                    onChange={(e) => updateSubtask(index, subtaskIndex, "description", e.target.value)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`tasks[${index}].subtasks[${subtaskIndex}].priority`}
                            render={() => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select
                                  value={subtask.priority}
                                  onValueChange={(value) => updateSubtask(index, subtaskIndex, "priority", value)}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`tasks[${index}].subtasks[${subtaskIndex}].estimatedHours`}
                            render={() => (
                              <FormItem>
                                <FormLabel>Estimated Hours</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Estimated hours"
                                    value={subtask.estimatedHours}
                                    onChange={(e) => updateSubtask(index, subtaskIndex, "estimatedHours", parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addSubtask(index)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subtask
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" onClick={addTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Template</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
