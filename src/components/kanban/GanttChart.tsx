import React, { useState, lazy, Suspense } from "react";
import { Task } from "@/types";
import { format, differenceInDays, addDays, startOfDay, parseISO, subDays, isWithinInterval } from "date-fns";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppContext } from "@/contexts/AppContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GanttChartProps {
  tasks: Task[];
}

interface TaskWithDetails {
  id: string;
  name: string;
  projectName: string;
  status: string;
  start: number;
  duration: number;
  level: number;
  color: string;
  task: Task;
}

const MAX_DATE_RANGE = 40; // Maximum date range in days

export function GanttChart({ tasks }: GanttChartProps) {
  const { projects, taskStatuses } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nestedTaskDialogOpen, setNestedTaskDialogOpen] = useState<boolean>(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Skip tasks without dates
  const tasksWithDates = tasks.filter(
    (task) => task.dueDate && task.createdAt
  );

  if (tasksWithDates.length === 0) {
    return (
      <div className="border-2 border-dashed border-muted rounded-md p-8 flex flex-col items-center justify-center bg-background/40 min-h-[400px]">
        <p className="text-lg font-medium mb-2">No Tasks with Dates</p>
        <p className="text-sm text-muted-foreground">
          Add start and due dates to your tasks to view them in the Gantt chart
        </p>
      </div>
    );
  }

  // Find earliest start date and latest end date from tasks
  const earliestDate = new Date(
    Math.min(
      ...tasksWithDates.map((task) => 
        new Date(task.createdAt).getTime()
      )
    )
  );
  
  const latestDate = new Date(
    Math.max(
      ...tasksWithDates.map((task) => 
        new Date(task.dueDate || new Date()).getTime()
      )
    )
  );

  // Initialize view range - default to earliest date as start and ensuring range doesn't exceed 40 days
  const [viewRange, setViewRange] = useState({
    startDate: startOfDay(earliestDate),
    endDate: startOfDay(addDays(earliestDate, Math.min(MAX_DATE_RANGE - 1, differenceInDays(latestDate, earliestDate))))
  });

  // Get color based on task status from dynamic definitions
  function getColorForStatus(status: string): string {
    const statusDef = taskStatuses.find(s => s.value === status);
    if (statusDef?.color) return statusDef.color;
    // Fallback colors
    switch (status) {
      case "backlog": return "#9CA3AF";
      case "todo": return "#60A5FA";
      case "in-progress": return "#F59E0B";
      case "review": 
      case "awaiting-feedback": return "#EC4899";
      case "done": return "#10B981";
      default: return "#9CA3AF";
    }
  }

  // Group tasks by project, parent task, and child tasks
  const chartData: TaskWithDetails[] = [];
  
  // Get all tasks by project
  const tasksByProject = new Map<string, Task[]>();
  tasksWithDates.forEach(task => {
    const projectTasks = tasksByProject.get(task.projectId) || [];
    projectTasks.push(task);
    tasksByProject.set(task.projectId, projectTasks);
  });
  
  // Filter tasks that fall within the view range
  const isInViewRange = (dateStr: string) => {
    const date = parseISO(dateStr);
    return isWithinInterval(date, {
      start: viewRange.startDate,
      end: viewRange.endDate
    });
  };
  
  // Process projects
  projects.forEach(project => {
    const projectTasks = tasksByProject.get(project.id);
    if (!projectTasks || projectTasks.length === 0) return;
    
    // Process all tasks
    projectTasks.forEach(task => {
      if (task.createdAt && task.dueDate && 
          (isInViewRange(task.createdAt) || isInViewRange(task.dueDate))) {
        const taskStartDate = parseISO(task.createdAt);
        const taskEndDate = parseISO(task.dueDate);
        
        const startDayOffset = differenceInDays(taskStartDate, viewRange.startDate);
        const duration = differenceInDays(taskEndDate, taskStartDate) + 1;
        
        chartData.push({
          id: task.id,
          name: task.title,
          projectName: project.name,
          status: task.status,
          start: startDayOffset,
          duration: duration > 0 ? duration : 1,
          level: 0,
          color: getColorForStatus(task.status),
          task: task
        });
      }
    });
  });

  // Generate date ticks for the timeline
  const dateTicks = [];
  const totalDays = differenceInDays(viewRange.endDate, viewRange.startDate) + 1;
  
  // Calculate tick interval based on total days (to avoid overcrowding)
  const tickInterval = totalDays <= 10 ? 1 : 
                      totalDays <= 20 ? 2 : 
                      totalDays <= 30 ? 3 : 5;
                      
  for (let i = 0; i <= totalDays; i += tickInterval) {
    dateTicks.push(i);
  }
  
  // Handle task click to edit
  const handleTaskClick = (taskData: TaskWithDetails) => {
    if (taskData && taskData.task && taskData.task.id) {
      setSelectedTask(taskData.task);
      setIsEditDialogOpen(true);
    }
  };

  // Navigate to previous time range
  const goToPrevious = () => {
    const newStartDate = subDays(viewRange.startDate, MAX_DATE_RANGE);
    const newEndDate = subDays(viewRange.endDate, MAX_DATE_RANGE);
    setViewRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
  };

  // Navigate to next time range
  const goToNext = () => {
    const newStartDate = addDays(viewRange.startDate, MAX_DATE_RANGE);
    const newEndDate = addDays(viewRange.endDate, MAX_DATE_RANGE);
    setViewRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
  };

  // Handle date range selection
  const handleDateRangeChange = (date: Date | undefined) => {
    if (!date) return;
    
    const newStartDate = startOfDay(date);
    const newEndDate = addDays(newStartDate, MAX_DATE_RANGE - 1);
    
    setViewRange({
      startDate: newStartDate,
      endDate: newEndDate
    });
    
    setDateRangeOpen(false);
  };
  
  // Format date for display
  const formatXAxis = (value: number) => {
    const date = addDays(viewRange.startDate, value);
    return format(date, "MMM d");
  };
  
  // Status legend items from dynamic definitions
  const legendItems = taskStatuses
    .sort((a, b) => a.order - b.order)
    .map(status => ({
      status: status.value,
      color: status.color || getColorForStatus(status.value),
      label: status.label
    }));

  // Sort chart data for better display
  const sortedChartData = [...chartData].sort((a, b) => {
    // First sort by project name
    if (a.projectName !== b.projectName) {
      return a.projectName.localeCompare(b.projectName);
    }
    // Then by parent task name
    if (a.level === 0 && b.level === 1) return -1;
    if (a.level === 1 && b.level === 0) return 1;
    
    // Then by task start date
    return a.start - b.start;
  });

  return (
    <div className="w-full mt-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPrevious}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(viewRange.startDate, "MMM d, yyyy")} - {format(viewRange.endDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={viewRange.startDate}
                onSelect={handleDateRangeChange}
                disabled={(date) => date > addDays(latestDate, MAX_DATE_RANGE) || date < subDays(earliestDate, MAX_DATE_RANGE)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="p-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Selecting a date will show a {MAX_DATE_RANGE}-day range from that date.
                </p>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNext}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center">
          <div className="text-sm font-medium mr-2">Task Status:</div>
          <div className="flex gap-3">
            {legendItems.map(item => (
              <div key={item.status} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full border rounded-md overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[200px]">Project</TableHead>
              <TableHead className="w-[250px]">Task</TableHead>
              <TableHead className="w-full relative h-16">
                <div className="pb-2">
                  <span className="ml-2">Timeline</span>
                </div>
                {/* Add date ticks below the timeline text with proper spacing */}
                <div className="absolute bottom-4 left-0 right-0 flex w-full">
                  {dateTicks.map((tick, index) => (
                    <div 
                      key={index} 
                      className="text-xs text-muted-foreground absolute"
                      style={{ 
                        left: `${(tick / totalDays) * 100}%`, 
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatXAxis(tick)}
                    </div>
                  ))}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChartData.map((task, index) => (
              <TableRow 
                key={`${task.id}-${index}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleTaskClick(task)}
              >
                <TableCell>{task.projectName}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-2" 
                      style={{ backgroundColor: task.color }}
                    ></div>
                    {task.name}
                  </div>
                </TableCell>
                <TableCell className="p-0 relative">
                  <div className="w-full h-[40px] relative">
                    {/* Conditional rendering to handle tasks that might start before the view range */}
                    {task.start <= totalDays && (
                      <div 
                        className="absolute h-[20px] rounded-md top-[10px]"
                        style={{
                          left: `${Math.max(0, (task.start / totalDays) * 100)}%`,
                          width: `${Math.min(100 - (Math.max(0, task.start) / totalDays) * 100, (task.duration / totalDays) * 100)}%`,
                          backgroundColor: task.color,
                          minWidth: '10px'
                        }}
                      >
                        {task.duration > 3 && (
                          <span className="text-xs text-white px-2 overflow-hidden whitespace-nowrap">
                            {task.duration}d
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {sortedChartData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No tasks in the selected date range
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add edit dialog for Gantt chart task */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
