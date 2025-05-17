
import React from "react";
import { Task } from "@/types";
import { format, differenceInDays, addDays, startOfDay, parseISO, subDays, isWithinInterval } from "date-fns";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
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
  parentTaskName: string;
  status: string;
  start: number;
  duration: number;
  level: number;
  color: string;
  task: Task;
}

const MAX_DATE_RANGE = 40; // Maximum date range in days

export function GanttChart({ tasks }: GanttChartProps) {
  const { projects } = useAppContext();
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

  // Get color based on task status
  function getColorForStatus(status: string): string {
    switch (status) {
      case "backlog": return "#9CA3AF";
      case "todo": return "#60A5FA";
      case "in-progress": return "#F59E0B";
      case "review": return "#EC4899";
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
    
    // Get parent tasks (those without a parent)
    const parentTasks = projectTasks.filter(task => !task.parentTaskId);
    
    // Process each parent task
    parentTasks.forEach(parentTask => {
      // Check if task is in view range
      if (parentTask.createdAt && parentTask.dueDate && 
          (isInViewRange(parentTask.createdAt) || isInViewRange(parentTask.dueDate))) {
        const taskStartDate = parseISO(parentTask.createdAt);
        const taskEndDate = parseISO(parentTask.dueDate);
        
        const startDayOffset = differenceInDays(taskStartDate, viewRange.startDate);
        const duration = differenceInDays(taskEndDate, taskStartDate) + 1;
        
        chartData.push({
          id: parentTask.id,
          name: parentTask.title,
          projectName: project.name,
          parentTaskName: "", // This is a parent task
          status: parentTask.status,
          start: startDayOffset,
          duration: duration > 0 ? duration : 1,
          level: 0, // Parent task
          color: getColorForStatus(parentTask.status),
          task: parentTask
        });
        
        // Add child tasks
        const childTasks = projectTasks.filter(task => task.parentTaskId === parentTask.id);
        childTasks.forEach(childTask => {
          if (childTask.createdAt && childTask.dueDate &&
              (isInViewRange(childTask.createdAt) || isInViewRange(childTask.dueDate))) {
            const childStartDate = parseISO(childTask.createdAt);
            const childEndDate = parseISO(childTask.dueDate);
            
            const childStartDayOffset = differenceInDays(childStartDate, viewRange.startDate);
            const childDuration = differenceInDays(childEndDate, childStartDate) + 1;
            
            chartData.push({
              id: childTask.id,
              name: childTask.title,
              projectName: project.name,
              parentTaskName: parentTask.title,
              status: childTask.status,
              start: childStartDayOffset,
              duration: childDuration > 0 ? childDuration : 1,
              level: 1, // Child task
              color: getColorForStatus(childTask.status),
              task: childTask
            });
          }
        });
      }
    });
    
    // Process orphan tasks (those without parent-child relationship)
    const orphanTasks = projectTasks.filter(task => 
      !task.parentTaskId && !parentTasks.includes(task)
    );
    
    orphanTasks.forEach(task => {
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
          parentTaskName: "", // No parent
          status: task.status,
          start: startDayOffset,
          duration: duration > 0 ? duration : 1,
          level: 0, // Treat as parent
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
  
  // Status legend items
  const legendItems = [
    { status: "backlog", color: "#9CA3AF", label: "Backlog" },
    { status: "todo", color: "#60A5FA", label: "To Do" },
    { status: "in-progress", color: "#F59E0B", label: "In Progress" },
    { status: "review", color: "#EC4899", label: "Review" },
    { status: "done", color: "#10B981", label: "Done" }
  ];

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
              <TableHead className="w-[200px]">Parent Task</TableHead>
              <TableHead className="w-[200px]">Task</TableHead>
              <TableHead className="w-full relative">
                {/* Add date ticks at the top of the timeline column */}
                <div className="absolute top-0 left-0 right-0 flex w-full">
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
                <span className="ml-2 pt-6 inline-block">Timeline</span>
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
                  {task.level === 1 ? task.parentTaskName : ""}
                </TableCell>
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
