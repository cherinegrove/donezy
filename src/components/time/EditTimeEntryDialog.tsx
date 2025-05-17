import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
    getTaskById
  } = useAppContext();
  
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
  const [billable, setBillable] = useState<boolean>(true); // Changed from useState<true>
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
      setBillable(timeEntry.billable);
      setStatus(timeEntry.status || "pending");
    } else {
      // Set defaults for new entry
      const now = new Date();
      setStartDate(format(now, "yyyy-MM-dd"));
      setStartTime(format(now, "HH:mm"));
      setEndDate(format(now, "yyyy-MM-dd"));
      setEndTime(format(now, "HH:mm"));
      setBillable(true);
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
  
  // Handle submit
  const handleSubmit = () => {
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
    
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    // Create or update time entry
    const timeEntryData = {
      taskId: taskId || undefined,
      projectId: projectId || undefined,
      clientId,
      userId: currentUser.id,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration,
      notes,
      billable,
      status,
      manuallyAdded: isNewEntry || (timeEntry?.manuallyAdded ?? true),
      edited: isNewEntry ? false : true
    };
    
    try {
      if (timeEntry && !isNewEntry) {
        // Update existing entry
        updateTimeEntry(timeEntry.id, timeEntryData);
        
        toast({
          title: "Time entry updated",
          description: "Your time entry has been updated successfully."
        });
      } else {
        // Add new entry
        addTimeEntry({
          ...timeEntryData,
          manuallyAdded: true
        });
        
        toast({
          title: "Time entry added",
          description: "Your time entry has been added successfully."
        });
      }
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem saving the time entry",
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="billable">Billable</Label>
              <Switch 
                id="billable" 
                checked={billable}
                onCheckedChange={(checked) => setBillable(checked)} 
              />
            </div>
            
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TimeEntryStatus)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved-billable">Approved (Billable)</SelectItem>
                    <SelectItem value="approved-non-billable">Approved (Non-billable)</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isNewEntry ? "Add Entry" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
