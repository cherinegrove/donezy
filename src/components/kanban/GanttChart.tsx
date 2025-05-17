
import React from "react";
import { Task } from "@/types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  Rectangle 
} from "recharts";
import { format, differenceInDays, addDays, startOfDay, parseISO, addMonths, addWeeks } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface GanttChartProps {
  tasks: Task[];
}

type ViewScale = "day" | "week" | "month";

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

export function GanttChart({ tasks }: GanttChartProps) {
  const { projects } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewScale, setViewScale] = useState<ViewScale>("week");
  const [nestedTaskDialogOpen, setNestedTaskDialogOpen] = useState<boolean>(false);

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

  // Find earliest start date and latest end date
  const startDate = new Date(
    Math.min(
      ...tasksWithDates.map((task) => 
        new Date(task.createdAt).getTime()
      )
    )
  );
  
  const endDate = new Date(
    Math.max(
      ...tasksWithDates.map((task) => 
        new Date(task.dueDate || new Date()).getTime()
      )
    )
  );

  const projectStartDate = startOfDay(startDate);
  const projectEndDate = startOfDay(endDate);

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
  
  // Process projects
  projects.forEach(project => {
    const projectTasks = tasksByProject.get(project.id);
    if (!projectTasks || projectTasks.length === 0) return;
    
    // Get parent tasks (those without a parent)
    const parentTasks = projectTasks.filter(task => !task.parentTaskId);
    
    // Process each parent task
    parentTasks.forEach(parentTask => {
      if (parentTask.createdAt && parentTask.dueDate) {
        const taskStartDate = parseISO(parentTask.createdAt);
        const taskEndDate = parseISO(parentTask.dueDate);
        
        const startDayOffset = differenceInDays(taskStartDate, projectStartDate);
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
          if (childTask.createdAt && childTask.dueDate) {
            const childStartDate = parseISO(childTask.createdAt);
            const childEndDate = parseISO(childTask.dueDate);
            
            const childStartDayOffset = differenceInDays(childStartDate, projectStartDate);
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
      if (task.createdAt && task.dueDate) {
        const taskStartDate = parseISO(task.createdAt);
        const taskEndDate = parseISO(task.dueDate);
        
        const startDayOffset = differenceInDays(taskStartDate, projectStartDate);
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
  
  // Generate x-axis ticks based on view scale
  const dateTicks = [];
  let tickInterval = 1;
  
  switch (viewScale) {
    case "day":
      tickInterval = 1;
      break;
    case "week":
      tickInterval = 7;
      break;
    case "month":
      tickInterval = 30;
      break;
  }
  
  const totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;
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

  // Format X-axis ticks (dates)
  const formatXAxis = (value: number) => {
    const date = addDays(projectStartDate, value);
    switch (viewScale) {
      case "day":
        return format(date, "MMM d");
      case "week":
        return format(date, "MMM d");
      case "month":
        return format(date, "MMM yyyy");
    }
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
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">View Scale:</div>
          <Select value={viewScale} onValueChange={(value: ViewScale) => setViewScale(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Project</TableHead>
              <TableHead className="w-[200px]">Parent Task</TableHead>
              <TableHead className="w-[200px]">Task</TableHead>
              <TableHead className="w-full">Timeline</TableHead>
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
                <TableCell className="p-0">
                  <div className="w-full h-[40px] relative">
                    <div 
                      className="absolute h-[20px] rounded-md top-[10px]"
                      style={{
                        left: `${(task.start / totalDays) * 100}%`,
                        width: `${(task.duration / totalDays) * 100}%`,
                        backgroundColor: task.color,
                        minWidth: '10px'
                      }}
                    >
                      {task.duration > 5 && (
                        <span className="text-xs text-white px-2 overflow-hidden whitespace-nowrap">
                          {task.duration}d
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-2 border-t pt-2">
        <div className="flex ml-[600px] overflow-x-auto">
          {dateTicks.map((tick, index) => (
            <div key={index} className="text-xs text-muted-foreground px-1">
              {formatXAxis(tick)}
            </div>
          ))}
        </div>
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
