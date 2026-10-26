import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface StartTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTimer: () => void;
  defaultProjectId?: string;
  defaultTaskId?: string;
}

export function StartTimerDialog({
  open,
  onOpenChange,
  onStartTimer,
  defaultProjectId,
  defaultTaskId,
}: StartTimerDialogProps) {
  const { clients, projects, tasks, currentUser, startTimeTracking, projectStatuses } = useAppContext();
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || "");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTaskId || "");
  const [taskComboOpen, setTaskComboOpen] = useState(false);
  const [notes, setNotes] = useState<string>("");
  
  // Reset form when dialog opens (only depend on open state, not data changes)
  useEffect(() => {
    if (open) {
      // Set task if provided
      if (defaultTaskId) {
        setSelectedTaskId(defaultTaskId);

        // Auto-select project from task
        const task = tasks.find(t => t.id === defaultTaskId);
        if (task) {
          setSelectedProjectId(task.projectId);
          // Auto-select client from project
          const project = projects.find(p => p.id === task.projectId);
          if (project) {
            setSelectedClientId(project.clientId);
          }
        }
      } else if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
        setSelectedTaskId("");

        // Auto-select client from project
        const project = projects.find(p => p.id === defaultProjectId);
        if (project) {
          setSelectedClientId(project.clientId);
        }
      } else {
        setSelectedProjectId("");
        setSelectedTaskId("");
        setSelectedClientId("");
      }
    }
  }, [open, defaultProjectId, defaultTaskId]);
  
  // If Project is selected, use its client; otherwise use manually selected client
  const effectiveClientId = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)?.clientId || selectedClientId
    : selectedClientId;

  // Filter projects - show all non-completed projects, then filter by client if one is selected
  const clientProjects = projects.filter(project => {
    const projectStatus = projectStatuses.find(s => s.value === project.status);
    if (projectStatus?.isFinal) return false;

    // If a client is selected (manually or via project), filter to that client
    if (effectiveClientId && project.clientId !== effectiveClientId) return false;
    return true;
  });

  // Filter tasks by selected project and sort alphabetically
  const projectTasks = selectedProjectId
    ? tasks
        .filter(task => task.projectId === selectedProjectId)
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];

  // Get selected task name for display
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Determine if client field should be disabled (locked by project selection)
  const isClientDisabled = !!selectedProjectId;

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId(""); // Clear task when project changes

    // Auto-set client from project
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedClientId(project.clientId);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId(""); // Clear project when client changes (if not already set via project)
    setSelectedTaskId(""); // Clear task
  };

  const handleStartTimer = async () => {
    console.log('🎯 StartTimerDialog: handleStartTimer called with:', {
      selectedClientId,
      effectiveClientId,
      selectedProjectId,
      selectedTaskId
    });

    // Check if project is completed
    if (selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject) {
        const projectStatus = projectStatuses.find(s => s.value === selectedProject.status);
        if (projectStatus?.isFinal) {
          toast.error('Cannot start timer for completed projects', {
            description: 'Please select a different project',
          });
          return;
        }
      }
    }

    if (!selectedProjectId) {
      toast.error('Project is required', {
        description: 'Please select a project to start a timer',
      });
      return;
    }

    if (effectiveClientId) {
      try {
        console.log('🚀 StartTimerDialog: Calling AppContext startTimeTracking...');
        await startTimeTracking(selectedTaskId || undefined, selectedProjectId, effectiveClientId, undefined, notes || undefined);

        // Only proceed if successful
        onStartTimer();
        onOpenChange(false);
        setNotes(""); // Reset notes after starting timer
        toast.success('Timer started', {
          description: `Started tracking time on ${selectedTask?.title || 'task'}`,
        });
      } catch (error) {
        console.error('❌ Failed to start timer:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to start timer. Please check your connection and try again.';
        toast.error('Failed to start timer', {
          description: errorMsg,
        });
      }
    } else {
      console.error('❌ StartTimerDialog: No client selected!');
      toast.error('No client available', {
        description: 'Please select a valid project with a client',
      });
    }
  };

  // Enable start button only when a project is selected (which auto-selects client)
  const canStartTimer = !!selectedProjectId;
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('🔄 StartTimerDialog: open state changing from', open, 'to', newOpen);
      if (newOpen) {
        console.log('📊 StartTimerDialog: Available clients:', clients.length, clients.map(c => c.name));
        console.log('📋 Can start timer:', canStartTimer, 'Selected client:', selectedClientId);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Time Tracking</DialogTitle>
          <DialogDescription>
            {clients.length === 0 ? 'No clients available - create a client first' : 'Select a client to start tracking time'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">
              Client {isClientDisabled && "(auto-selected)"}
            </Label>
            <Select
              value={effectiveClientId}
              onValueChange={handleClientChange}
              disabled={isClientDisabled}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project">Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {clientProjects.length > 0 ? (
                  clientProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No projects available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="task">Task (Optional)</Label>
            <select
              id="task"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={!selectedProjectId}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No task</option>
              {projectTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about what you're working on..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleStartTimer} disabled={!canStartTimer}>
            Start Timer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
