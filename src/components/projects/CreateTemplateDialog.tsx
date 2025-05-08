
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { useAppContext } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TemplateTask,
  TemplateSubtask,
  TaskStatus,
} from "@/types";
import { Plus, Trash2, FileText } from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Template description is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  defaultDuration: z.number().optional(),
  allocatedHours: z.number().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
}: CreateTemplateDialogProps) {
  const { addProjectTemplate, currentUser, teams } = useAppContext();
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [currentTab, setCurrentTab] = useState("details");
  const [subtasksMap, setSubtasksMap] = useState<Record<string, TemplateSubtask[]>>({});

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      serviceType: "project",
      defaultDuration: undefined,
      allocatedHours: undefined,
    },
  });

  const addTask = () => {
    const taskId = uuidv4();
    const newTask: TemplateTask = {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      subtasks: [],
    };
    setTasks([...tasks, newTask]);
    setSubtasksMap({...subtasksMap, [taskId]: []});
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const removeTask = (index: number) => {
    const updatedTasks = [...tasks];
    updatedTasks.splice(index, 1);
    setTasks(updatedTasks);
  };

  const addSubtask = (taskIndex: number) => {
    const taskId = uuidv4();
    const newSubtask: TemplateSubtask = {
      title: "",
      description: "",
    };
    
    const updatedSubtasks = [...(subtasksMap[taskId] || []), newSubtask];
    setSubtasksMap({...subtasksMap, [taskId]: updatedSubtasks});
    
    // Update the task's subtasks
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subtasks = updatedSubtasks;
    setTasks(updatedTasks);
  };

  const updateSubtask = (taskIndex: number, subtaskIndex: number, field: keyof TemplateSubtask, value: any) => {
    const taskId = uuidv4();
    const updatedSubtasks = [...(subtasksMap[taskId] || [])];
    updatedSubtasks[subtaskIndex] = { ...updatedSubtasks[subtaskIndex], [field]: value };
    setSubtasksMap({...subtasksMap, [taskId]: updatedSubtasks});
    
    // Update the task's subtasks
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subtasks = updatedSubtasks;
    setTasks(updatedTasks);
  };

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    const taskId = uuidv4();
    const updatedSubtasks = [...(subtasksMap[taskId] || [])];
    updatedSubtasks.splice(subtaskIndex, 1);
    setSubtasksMap({...subtasksMap, [taskId]: updatedSubtasks});
    
    // Update the task's subtasks
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subtasks = updatedSubtasks;
    setTasks(updatedTasks);
  };

  const onSubmit = (data: TemplateFormData) => {
    // Validate tasks
    if (tasks.some(task => !task.title)) {
      alert("All tasks must have titles");
      return;
    }

    // Create template
    addProjectTemplate({
      name: data.name,
      description: data.description,
      serviceType: data.serviceType,
      defaultDuration: data.defaultDuration,
      allocatedHours: data.allocatedHours,
      tasks: tasks,
      createdBy: currentUser?.id || "",
      teamIds: [],
    });

    // Reset form and close dialog
    form.reset();
    setTasks([]);
    setSubtasksMap({});
    onOpenChange(false);
  };

  const canGoToTasks = form.getValues("name") && form.getValues("description");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
          <DialogDescription>
            Create reusable project templates for recurring projects
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Template Details</TabsTrigger>
            <TabsTrigger value="tasks" disabled={!canGoToTasks}>Tasks & Subtasks</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="details" className="space-y-4 mt-4">
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
                          placeholder="Template description"
                          rows={3}
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                            placeholder="Enter default duration"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: Default project duration in days
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="allocatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Allocated Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter allocated hours"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Default hours allocated for this project type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setCurrentTab("tasks")}>
                    Next: Define Tasks
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Template Tasks</h3>
                  <Button type="button" onClick={addTask} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </div>

                {tasks.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground text-center">
                        No tasks defined yet. Add tasks to your template.
                      </p>
                      <Button type="button" onClick={addTask} className="mt-4">
                        <Plus className="h-4 w-4 mr-1" /> Add First Task
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task, taskIndex) => (
                      <Card key={taskIndex}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Task {taskIndex + 1}</CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(taskIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <FormLabel>Title</FormLabel>
                              <Input
                                value={task.title}
                                onChange={(e) => updateTask(taskIndex, "title", e.target.value)}
                                placeholder="Task title"
                              />
                            </div>
                            
                            <div>
                              <FormLabel>Description</FormLabel>
                              <Textarea
                                value={task.description}
                                onChange={(e) => updateTask(taskIndex, "description", e.target.value)}
                                placeholder="Task description"
                                rows={2}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FormLabel>Status</FormLabel>
                              <Select
                                value={task.status}
                                onValueChange={(value) => updateTask(taskIndex, "status", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">To Do</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="review">Review</SelectItem>
                                  <SelectItem value="backlog">Backlog</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FormLabel>Priority</FormLabel>
                              <Select
                                value={task.priority}
                                onValueChange={(value: any) => updateTask(taskIndex, "priority", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <FormLabel>Estimated Hours</FormLabel>
                            <Input
                              type="number"
                              value={task.estimatedHours || ""}
                              onChange={(e) => updateTask(taskIndex, "estimatedHours", e.target.value ? Number(e.target.value) : undefined)}
                              placeholder="Estimated hours"
                            />
                          </div>
                          
                          {/* Subtasks */}
                          <div className="pt-2">
                            <div className="flex justify-between items-center mb-2">
                              <FormLabel>Subtasks</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addSubtask(taskIndex)}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Subtask
                              </Button>
                            </div>
                            
                            {task.subtasks.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No subtasks defined</p>
                            ) : (
                              <div className="space-y-3">
                                {task.subtasks.map((subtask, subtaskIndex) => (
                                  <div key={subtaskIndex} className="border p-3 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                      <FormLabel className="mb-0">Subtask {subtaskIndex + 1}</FormLabel>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSubtask(taskIndex, subtaskIndex)}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                    <div className="space-y-2">
                                      <Input
                                        value={subtask.title}
                                        onChange={(e) => updateSubtask(taskIndex, subtaskIndex, "title", e.target.value)}
                                        placeholder="Subtask title"
                                      />
                                      <Textarea
                                        value={subtask.description}
                                        onChange={(e) => updateSubtask(taskIndex, subtaskIndex, "description", e.target.value)}
                                        placeholder="Subtask description"
                                        rows={1}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setCurrentTab("details")}>
                    Back to Details
                  </Button>
                  <Button type="submit">Create Template</Button>
                </DialogFooter>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
