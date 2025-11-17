import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ProjectSelect } from "./ProjectSelect";
import { AssigneeSelect } from "./AssigneeSelect";
import { PrioritySelect } from "./PrioritySelect";
import { CollaboratorSelect } from "./CollaboratorSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RecurringTask } from "@/types/recurring";

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTask?: RecurringTask;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function RecurringTaskDialog({ open, onOpenChange, onSuccess, editTask }: RecurringTaskDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState(editTask?.title || "");
  const [description, setDescription] = useState(editTask?.description || "");
  const [projectId, setProjectId] = useState(editTask?.project_id || "");
  const [assigneeId, setAssigneeId] = useState(editTask?.assignee_id || "");
  const [priority, setPriority] = useState(editTask?.priority || "medium");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>(editTask?.collaborator_ids || []);
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(editTask?.estimated_hours);
  
  const [recurrencePattern, setRecurrencePattern] = useState<string>(editTask?.recurrence_pattern || "daily");
  const [recurrenceInterval, setRecurrenceInterval] = useState(editTask?.recurrence_interval || 1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>(editTask?.days_of_week || []);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(editTask?.day_of_month);
  const [startDate, setStartDate] = useState<Date>(editTask?.start_date ? new Date(editTask.start_date) : new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(editTask?.end_date ? new Date(editTask.end_date) : undefined);
  const [hasEndDate, setHasEndDate] = useState(!!editTask?.end_date);

  const handleSubmit = async () => {
    if (!title.trim() || !projectId) {
      toast({
        title: "Validation Error",
        description: "Title and project are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Calculate next generation date
      const nextGenDate = new Date(startDate);
      nextGenDate.setHours(0, 0, 0, 0);

      const recurringTaskData = {
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        assignee_id: assigneeId || null,
        priority,
        collaborator_ids: collaboratorIds,
        estimated_hours: estimatedHours || null,
        recurrence_pattern: recurrencePattern,
        recurrence_interval: recurrenceInterval,
        days_of_week: recurrencePattern === 'weekly' ? selectedDaysOfWeek : null,
        day_of_month: recurrencePattern === 'monthly' ? dayOfMonth : null,
        start_date: startDate.toISOString(),
        end_date: hasEndDate && endDate ? endDate.toISOString() : null,
        next_generation_date: nextGenDate.toISOString(),
        is_active: true,
        auth_user_id: session.user.id,
      };

      if (editTask) {
        const { error } = await supabase
          .from('recurring_tasks')
          .update(recurringTaskData)
          .eq('id', editTask.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Recurring task updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('recurring_tasks')
          .insert(recurringTaskData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Recurring task created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving recurring task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save recurring task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setSelectedDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit" : "Create"} Recurring Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div>
            <Label>Project *</Label>
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assignee</Label>
              <AssigneeSelect value={assigneeId} onChange={setAssigneeId} />
            </div>

            <div>
              <Label>Priority</Label>
              <PrioritySelect value={priority} onChange={setPriority} />
            </div>
          </div>

          <div>
            <Label>Collaborators</Label>
            <CollaboratorSelect field={{ value: collaboratorIds, onChange: setCollaboratorIds }} />
          </div>

          <div>
            <Label htmlFor="estimated-hours">Estimated Hours</Label>
            <Input
              id="estimated-hours"
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours || ""}
              onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Enter estimated hours"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Recurrence Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pattern</Label>
                <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Repeat Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {recurrencePattern === 'daily' && 'day(s)'}
                    {recurrencePattern === 'weekly' && 'week(s)'}
                    {recurrencePattern === 'monthly' && 'month(s)'}
                  </span>
                </div>
              </div>
            </div>

            {recurrencePattern === 'weekly' && (
              <div className="mt-4">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDaysOfWeek.includes(day.value)}
                        onCheckedChange={() => toggleDayOfWeek(day.value)}
                      />
                      <label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day.label.substring(0, 3)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurrencePattern === 'monthly' && (
              <div className="mt-4">
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth || ""}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  placeholder="Enter day (1-31)"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="has-end-date"
                    checked={hasEndDate}
                    onCheckedChange={(checked) => setHasEndDate(checked as boolean)}
                  />
                  <Label htmlFor="has-end-date">Set End Date</Label>
                </div>
                {hasEndDate && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : editTask ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
