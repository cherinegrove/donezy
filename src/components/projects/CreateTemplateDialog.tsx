import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { TemplateTask } from "@/types";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTemplateDialog({ isOpen, onClose }: CreateTemplateDialogProps) {
  const { addProjectTemplate, teams, currentUser } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState<'project' | 'bank-hours' | 'pay-as-you-go'>('project');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [allocatedHours, setAllocatedHours] = useState(0);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);

  const addTask = () => {
    const newTask: TemplateTask = {
      title: "",
      description: "",
      priority: "medium",
      estimatedHours: 0,
      subtasks: []
    };
    setTasks([...tasks, newTask]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const addSubtask = (taskIndex: number) => {
    const newSubtask: TemplateTask = {
      title: "",
      description: "",
      priority: "medium",
      estimatedHours: 0
    };
    
    const updatedTasks = [...tasks];
    if (!updatedTasks[taskIndex].subtasks) {
      updatedTasks[taskIndex].subtasks = [];
    }
    updatedTasks[taskIndex].subtasks!.push(newSubtask);
    setTasks(updatedTasks);
  };

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subtasks = updatedTasks[taskIndex].subtasks?.filter((_, i) => i !== subtaskIndex);
    setTasks(updatedTasks);
  };

  const updateSubtask = (taskIndex: number, subtaskIndex: number, field: keyof TemplateTask, value: any) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[taskIndex].subtasks) {
      updatedTasks[taskIndex].subtasks![subtaskIndex] = {
        ...updatedTasks[taskIndex].subtasks![subtaskIndex],
        [field]: value
      };
      setTasks(updatedTasks);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    addProjectTemplate({
      name,
      description,
      serviceType,
      defaultDuration,
      allocatedHours,
      tasks,
      createdBy: currentUser?.id || '',
      teamIds: selectedTeams
    });

    toast({
      title: "Success",
      description: "Template created successfully",
    });

    // Reset form
    setName("");
    setDescription("");
    setServiceType('project');
    setDefaultDuration(30);
    setAllocatedHours(0);
    setSelectedTeams([]);
    setTasks([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80%] sm:max-h-[90%]">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                  <SelectItem value="pay-as-you-go">Pay as you go</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultDuration">Default Duration (days)</Label>
                <Input
                  id="defaultDuration"
                  type="number"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocatedHours">Allocated Hours</Label>
                <Input
                  id="allocatedHours"
                  type="number"
                  value={allocatedHours}
                  onChange={(e) => setAllocatedHours(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teams (optional)</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`team-${team.id}`}
                    checked={selectedTeams.includes(team.id)}
                    onChange={() =>
                      setSelectedTeams((prev) =>
                        prev.includes(team.id)
                          ? prev.filter((id) => id !== team.id)
                          : [...prev, team.id]
                      )
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`team-${team.id}`} className="font-normal">
                    {team.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Tasks</h3>
              <Button type="button" size="sm" onClick={addTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            <div className="space-y-4">
              {tasks.map((task, taskIndex) => (
                <Card key={taskIndex}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Task {taskIndex + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(taskIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`task-title-${taskIndex}`}>Title</Label>
                        <Input
                          type="text"
                          id={`task-title-${taskIndex}`}
                          value={task.title}
                          onChange={(e) =>
                            updateTask(taskIndex, "title", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`task-priority-${taskIndex}`}>Priority</Label>
                        <Select
                          value={task.priority}
                          onValueChange={(value: any) =>
                            updateTask(taskIndex, "priority", value)
                          }
                        >
                          <SelectTrigger id={`task-priority-${taskIndex}`}>
                            <SelectValue placeholder="Select priority" />
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
                      <Label htmlFor={`task-description-${taskIndex}`}>Description</Label>
                      <Textarea
                        id={`task-description-${taskIndex}`}
                        value={task.description}
                        onChange={(e) =>
                          updateTask(taskIndex, "description", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor={`task-estimated-hours-${taskIndex}`}>Estimated Hours</Label>
                      <Input
                        type="number"
                        id={`task-estimated-hours-${taskIndex}`}
                        value={task.estimatedHours}
                        onChange={(e) =>
                          updateTask(
                            taskIndex,
                            "estimatedHours",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                    <Collapsible>
                      <CollapsibleTrigger className="w-full flex items-center justify-between py-2">
                        Subtasks
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2">
                          {task.subtasks && task.subtasks.map((subtask, subtaskIndex) => (
                            <Card key={subtaskIndex} className="ml-4">
                              <CardHeader>
                                <div className="flex justify-between items-center">
                                  <CardTitle>Subtask {subtaskIndex + 1}</CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSubtask(taskIndex, subtaskIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div>
                                  <Label htmlFor={`subtask-title-${taskIndex}-${subtaskIndex}`}>Title</Label>
                                  <Input
                                    type="text"
                                    id={`subtask-title-${taskIndex}-${subtaskIndex}`}
                                    value={subtask.title}
                                    onChange={(e) =>
                                      updateSubtask(
                                        taskIndex,
                                        subtaskIndex,
                                        "title",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`subtask-description-${taskIndex}-${subtaskIndex}`}>Description</Label>
                                  <Textarea
                                    id={`subtask-description-${taskIndex}-${subtaskIndex}`}
                                    value={subtask.description}
                                    onChange={(e) =>
                                      updateSubtask(
                                        taskIndex,
                                        subtaskIndex,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`subtask-priority-${taskIndex}-${subtaskIndex}`}>Priority</Label>
                                  <Select
                                    value={subtask.priority}
                                    onValueChange={(value: any) =>
                                      updateSubtask(
                                        taskIndex,
                                        subtaskIndex,
                                        "priority",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger id={`subtask-priority-${taskIndex}-${subtaskIndex}`}>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor={`subtask-estimated-hours-${taskIndex}-${subtaskIndex}`}>Estimated Hours</Label>
                                  <Input
                                    type="number"
                                    id={`subtask-estimated-hours-${taskIndex}-${subtaskIndex}`}
                                    value={subtask.estimatedHours}
                                    onChange={(e) =>
                                      updateSubtask(
                                        taskIndex,
                                        subtaskIndex,
                                        "estimatedHours",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            className="ml-4"
                            onClick={() => addSubtask(taskIndex)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Subtask
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
