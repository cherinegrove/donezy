import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { ProjectSelect } from "@/components/tasks/ProjectSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { TimeEntry, TimeEntryStatus } from "@/types";

interface ProjectSelectProps {
  defaultValue?: string;
  onProjectChange: (projectId: string) => void;
  placeholder?: string;
}

interface EditTimeEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntry?: TimeEntry;
  isNewEntry?: boolean;
}

export function EditTimeEntryDialog({ isOpen, onClose, timeEntry, isNewEntry = false }: EditTimeEntryDialogProps) {
  const { toast } = useToast();
const {
    projects,
    tasks,
    clients,
    currentUser,
    addTimeEntry,
    updateTimeEntry,
    addTask,
    getTaskById
  } = useAppContext();
  
  // Check admin using systemRoles
  const isAdmin = currentUser?.systemRoles?.includes('platform_admin') || 
                  currentUser?.systemRoles?.includes('support_admin');
  
  // Form state
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<TimeEntryStatus>("pending");

  // Initialize form with existing timeEntry data if editing
  useEffect(() => {
    if (timeEntry && !isNewEntry) {
      const startDateTime = new Date(timeEntry.startTime);
      const endDateTime = timeEntry.endTime ? new Date(timeEntry.endTime) : new Date();
      
      setProjectId(timeEntry.projectId || "");
      setTaskId(timeEntry.taskId || "");
      setClientId(timeEntry.clientId || "");
      setStartDate(format(startDateTime, "yyyy-MM-dd"));
      setStartTime(format(startDateTime, "HH:mm"));
      
      if (timeEntry.endTime) {
        setEndDate(format(endDateTime, "yyyy-MM-dd"));
        setEndTime(format(endDateTime, "HH:mm"));
      } else {
        setEndDate(format(new Date(), "yyyy-MM-dd"));
        setEndTime(format(new Date(), "HH:mm"));
      }
      
      setDuration(timeEntry.duration);
      setNotes(timeEntry.notes || "");
      setStatus(timeEntry.status || "pending");
    } else {
      // Set defaults for new entry
      const now = new Date();
      setStartDate(format(now, "yyyy-MM-dd"));
      setStartTime(format(now, "HH:mm"));
      setEndDate(format(now, "yyyy-MM-dd"));
      setEndTime(format(now, "HH:mm"));
      setStatus("pending");
      
      // Clear other fields
      setProjectId("");
      setTaskId("");
      setClientId("");
      setDuration(0);
      setNotes("");
    }
  }, [timeEntry, isNewEntry, isOpen]);

  // Update client ID when project changes
  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setClientId(project.clientId);
      }
    }
  }, [projectId, projects]);
  
  // Get project tasks for the selected project
  const projectTasks = tasks.filter(task => task.projectId === projectId);
  
  // Calculate duration when start/end times change
  useEffect(() => {
    if (startDate && startTime && endDate && endTime) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return;
      }
      
      if (end >= start) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / 60000);
        setDuration(diffMinutes);
      }
    }
  }, [startDate, startTime, endDate, endTime]);
  
  // Update times when duration changes manually
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    
    if (startDate && startTime) {
      const start = new Date(`${startDate}T${startTime}`);
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + newDuration * 60000);
        setEndDate(format(end, "yyyy-MM-dd"));
        setEndTime(format(end, "HH:mm"));
      }
    }
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Handle submit. When createTaskAfter is true, a new task is created from
  // this entry's project + notes (used as the title) and the entry is linked
  // to it — lets most manual entries end up tied to a task, with an easy way
  // to skip it for entries that don't need one (meetings, etc.).
  const handleSubmit = async (createTaskAfter = false) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    if (!clientId) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (duration <= 0) {
      toast({
        title: "Error",
        description: "Duration must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (createTaskAfter && !projectId) {
      toast({
        title: "Error",
        description: "Select a project first — a task has to belong to a project.",
        variant: "destructive",
      });
      return;
    }

    if (createTaskAfter && !notes.trim()) {
      toast({
        title: "Error",
        description: "Add a note describing the work — it becomes the task title.",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    // Create or update time entry
    const timeEntryData = {
      taskId: taskId || undefined,
      projectId: projectId || undefined,
      clientId,
      userId: currentUser.auth_user_id,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration,
      notes,
      status,
      manuallyAdded: isNewEntry || (timeEntry?.manuallyAdded ?? true),
      edited: isNewEntry ? false : true
    };

    try {
      let savedEntryId: string | undefined;

      if (timeEntry && !isNewEntry) {
        // Update existing entry
        await updateTimeEntry(timeEntry.id, timeEntryData);
        savedEntryId = timeEntry.id;

        toast({
          title: "Time entry updated",
          description: "Your time entry has been updated successfully."
        });
      } else {
        // Add new entry
        const newEntry = await addTimeEntry({
          ...timeEntryData,
          manuallyAdded: true
        });
        savedEntryId = newEntry?.id;

        toast({
          title: "Time entry added",
          description: "Your time entry has been added successfully."
        });
      }

      if (createTaskAfter && savedEntryId) {
        try {
          const newTaskId = await addTask({
            title: notes.trim(),
            description: "",
            projectId,
            assigneeId: currentUser.auth_user_id,
            status: "done",
            priority: "medium",
            subtasks: [],
          });

          if (newTaskId) {
            await updateTimeEntry(savedEntryId, { taskId: newTaskId });
            toast({
              title: "Task created",
              description: `"${notes.trim()}" was created and linked to this time entry.`,
            });
          }
        } catch (taskError) {
          console.error("Error creating task for time entry:", taskError);
          toast({
            title: "Time entry saved, but task creation failed",
            description: "You can create the task manually and link it from the entry.",
            variant: "destructive",
          });
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving time entry:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem saving the time entry",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isNewEntry ? "Add Time Entry" : "Edit Time Entry"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select 
              value={projectId} 
              onValueChange={setProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {projectId && (
            <div className="space-y-2">
              <Label htmlFor="task">Task (Optional)</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No task (project time)</SelectItem>
                  {projectTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duration ({formatDuration(duration)})</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="duration-hours"
                type="number"
                placeholder="Hours"
                min={0}
                value={Math.floor(duration / 60)}
                onChange={(e) => {
                  const hours = parseInt(e.target.value) || 0;
                  handleDurationChange((hours * 60) + (duration % 60));
                }}
              />
              <Input
                id="duration-minutes"
                type="number"
                placeholder="Minutes"
                min={0}
                max={59}
                value={duration % 60}
                onChange={(e) => {
                  const minutes = parseInt(e.target.value) || 0;
                  handleDurationChange((Math.floor(duration / 60) * 60) + minutes);
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="What did you work on?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TimeEntryStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {!taskId && (
          <p className="text-xs text-muted-foreground -mt-2">
            No task linked yet. Select a project and add a note above, then use
            "Save and Create Task" — or just save if this doesn't need one (e.g. a meeting).
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {!taskId && (
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={!projectId || !notes.trim()}
            >
              Save and Create Task
            </Button>
          )}
          <Button onClick={() => handleSubmit(false)}>
            {isNewEntry ? "Add Entry" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
