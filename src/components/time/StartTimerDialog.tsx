
import { useState, useEffect } from "react";
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

interface StartTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTimer: () => void;
  defaultProjectId?: string;
}

export function StartTimerDialog({
  open,
  onOpenChange,
  onStartTimer,
  defaultProjectId,
}: StartTimerDialogProps) {
  const { clients, projects, tasks, currentUser, startTimeTracking } = useAppContext();
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || "");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTaskId("");
      
      if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
        
        // If defaultProjectId is provided, auto-select the client
        const project = projects.find(p => p.id === defaultProjectId);
        if (project) {
          setSelectedClientId(project.clientId);
        }
      } else {
        setSelectedProjectId("");
      }
      
      // If there was no project or we couldn't find the client, reset client selection
      if (!selectedClientId) {
        setSelectedClientId("");
      }
    }
  }, [open, defaultProjectId, projects]);
  
  // Filter projects by selected client
  const clientProjects = selectedClientId 
    ? projects.filter(project => project.clientId === selectedClientId) 
    : projects;
  
  // Filter tasks by selected project
  const projectTasks = selectedProjectId 
    ? tasks.filter(task => task.projectId === selectedProjectId) 
    : [];
  
  const handleStartTimer = () => {
    console.log('🎯 StartTimerDialog: handleStartTimer called with:', {
      selectedClientId,
      selectedProjectId,
      selectedTaskId
    });
    
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
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Time Tracking</DialogTitle>
          <DialogDescription>Select a client to start tracking time</DialogDescription>
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
              onValueChange={setSelectedProjectId}
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
            <Select
              value={selectedTaskId}
              onValueChange={setSelectedTaskId}
              disabled={!selectedProjectId}
            >
              <SelectTrigger id="task">
                <SelectValue placeholder="Select task (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projectTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
