import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
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
  
  // Reset form when dialog opens
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
  }, [open, defaultProjectId, defaultTaskId, projects, tasks]);
  
  // Filter projects by selected client and exclude completed projects
  const clientProjects = selectedClientId 
    ? projects.filter(project => {
        if (project.clientId !== selectedClientId) return false;
        const projectStatus = projectStatuses.find(s => s.value === project.status);
        return !projectStatus?.isFinal;
      })
    : projects.filter(project => {
        const projectStatus = projectStatuses.find(s => s.value === project.status);
        return !projectStatus?.isFinal;
      });
  
  // Filter tasks by selected project and sort alphabetically
  const projectTasks = selectedProjectId 
    ? tasks
        .filter(task => task.projectId === selectedProjectId)
        .sort((a, b) => a.title.localeCompare(b.title))
    : [];
  
  // Get selected task name for display
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  
  const handleStartTimer = () => {
    console.log('🎯 StartTimerDialog: handleStartTimer called with:', {
      selectedClientId,
      selectedProjectId,
      selectedTaskId
    });
    
    // Check if project is completed
    if (selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject) {
        const projectStatus = projectStatuses.find(s => s.value === selectedProject.status);
        if (projectStatus?.isFinal) {
          toast('Cannot start timer for completed projects', {
            description: 'Please select a different project',
          });
          return;
        }
      }
    }
    
    if (selectedClientId) {
      console.log('🚀 StartTimerDialog: Calling AppContext startTimeTracking...');
      startTimeTracking(selectedTaskId || undefined, selectedProjectId || undefined, selectedClientId);
      onStartTimer();
      onOpenChange(false);
    } else {
      console.error('❌ StartTimerDialog: No client selected!');
    }
  };
  
  // Only enable the Start Timer button when a client is selected
  const canStartTimer = !!selectedClientId;
  
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
            <Label htmlFor="client">Client (Required)</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
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
            <Label htmlFor="project">Project (Optional)</Label>
            <Select
              value={selectedProjectId}
              onValueChange={(value) => {
                setSelectedProjectId(value);
                setSelectedTaskId(""); // Clear task when project changes
              }}
              disabled={!selectedClientId}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {clientProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="task">Task (Optional)</Label>
            <Popover open={taskComboOpen} onOpenChange={setTaskComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={taskComboOpen}
                  className="w-full justify-between font-normal"
                  disabled={!selectedProjectId}
                >
                  {selectedTask ? selectedTask.title : "Search and select task..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tasks..." />
                  <CommandList>
                    <CommandEmpty>No tasks found.</CommandEmpty>
                    <CommandGroup>
                      {projectTasks.map((task) => (
                        <CommandItem
                          key={task.id}
                          value={task.title}
                          onSelect={() => {
                            setSelectedTaskId(task.id);
                            setTaskComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTaskId === task.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {task.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
