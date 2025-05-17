
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { TimeEntry } from "@/types";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock } from "lucide-react";

interface EditTimeEntryDialogProps {
  timeEntry?: TimeEntry;
  isOpen: boolean;
  onClose: () => void;
  isNewEntry?: boolean;
}

export function EditTimeEntryDialog({ timeEntry, isOpen, onClose, isNewEntry = false }: EditTimeEntryDialogProps) {
  const { updateTask, projects, clients, tasks, currentUser, addTimeEntry } = useAppContext();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(
    timeEntry ? new Date(timeEntry.startTime) : new Date()
  );
  
  const [startTime, setStartTime] = useState(
    timeEntry ? format(new Date(timeEntry.startTime), "HH:mm") : "09:00"
  );
  
  const [endTime, setEndTime] = useState(
    timeEntry && timeEntry.endTime 
      ? format(new Date(timeEntry.endTime), "HH:mm") 
      : "17:00"
  );
  
  const [notes, setNotes] = useState(timeEntry?.notes || "");
  const [billable, setBillable] = useState(timeEntry?.billable || true);
  const [selectedClientId, setSelectedClientId] = useState(timeEntry?.clientId || "");
  const [selectedProjectId, setSelectedProjectId] = useState(timeEntry?.projectId || "");
  const [selectedTaskId, setSelectedTaskId] = useState(timeEntry?.taskId || "");
  
  // Filter projects based on selected client
  const clientProjects = projects.filter(project => project.clientId === selectedClientId);
  
  // Filter tasks based on selected project
  const projectTasks = tasks.filter(task => task.projectId === selectedProjectId);
  
  // Calculate duration in minutes
  const calculateDuration = (start: string, end: string) => {
    if (!date) return 0;
    
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    
    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0);
    
    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0);
    
    // If end time is before start time, assume it's the next day
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
    return durationMinutes;
  };
  
  const handleSave = () => {
    if (!date || !startTime || !endTime || !selectedClientId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Construct ISO date strings with the correct time
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    
    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0);
    
    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0);
    
    // If end time is before start time, assume it's the next day
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const duration = calculateDuration(startTime, endTime);
    
    if (isNewEntry) {
      // Create new time entry
      addTimeEntry({
        taskId: selectedTaskId || undefined,
        projectId: selectedProjectId || undefined,
        clientId: selectedClientId,
        userId: currentUser?.id || "",
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        duration,
        notes,
        billable,
        status: 'pending',
        manuallyAdded: true
      });
      
      toast({
        title: "Time Entry Added",
        description: "Your time entry has been added successfully"
      });
    } else if (timeEntry) {
      // We would update the time entry here, but the context doesn't have updateTimeEntry yet
      // For now, we'll just show a toast
      toast({
        title: "Feature Not Implemented",
        description: "Updating time entries is not implemented yet"
      });
    }
    
    onClose();
  };
  
  useEffect(() => {
    if (timeEntry) {
      setDate(new Date(timeEntry.startTime));
      setStartTime(format(new Date(timeEntry.startTime), "HH:mm"));
      if (timeEntry.endTime) {
        setEndTime(format(new Date(timeEntry.endTime), "HH:mm"));
      }
      setNotes(timeEntry.notes || "");
      setBillable(timeEntry.billable);
      setSelectedClientId(timeEntry.clientId);
      setSelectedProjectId(timeEntry.projectId || "");
      setSelectedTaskId(timeEntry.taskId || "");
    } else {
      setDate(new Date());
      setStartTime("09:00");
      setEndTime("17:00");
      setNotes("");
      setBillable(true);
      setSelectedClientId("");
      setSelectedProjectId("");
      setSelectedTaskId("");
    }
  }, [timeEntry, isOpen]);
  
  // Handle client change
  useEffect(() => {
    if (selectedClientId && !clientProjects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId("");
      setSelectedTaskId("");
    }
  }, [selectedClientId]);
  
  // Handle project change
  useEffect(() => {
    if (selectedProjectId && !projectTasks.find(t => t.id === selectedTaskId)) {
      setSelectedTaskId("");
    }
  }, [selectedProjectId]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isNewEntry ? "Add Time Entry" : "Edit Time Entry"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
          
          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select 
              value={selectedProjectId} 
              onValueChange={setSelectedProjectId}
              disabled={!selectedClientId || clientProjects.length === 0}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
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
          
          <div className="space-y-2">
            <Label htmlFor="task">Task (Optional)</Label>
            <Select 
              value={selectedTaskId} 
              onValueChange={setSelectedTaskId}
              disabled={!selectedProjectId || projectTasks.length === 0}
            >
              <SelectTrigger id="task">
                <SelectValue placeholder="Select task" />
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
          
          <div className="space-y-2">
            <Label htmlFor="notes">Description</Label>
            <Textarea
              id="notes"
              placeholder="What did you work on?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="billable"
              checked={billable}
              onCheckedChange={setBillable}
            />
            <Label htmlFor="billable">Billable time</Label>
          </div>
          
          {timeEntry?.manuallyAdded && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2 text-sm border border-yellow-200 dark:border-yellow-800">
              This entry was manually added
            </div>
          )}
          
          {timeEntry?.edited && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-2 text-sm border border-blue-200 dark:border-blue-800">
              This entry has been edited
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {isNewEntry ? "Add Time Entry" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
