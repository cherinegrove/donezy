
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

interface GanttChartProps {
  tasks: Task[];
}

type ViewScale = "day" | "week" | "month";

interface TaskWithDetails {
  id: string;
  name: string;
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

  // Group tasks by project and organize hierarchically
  const projectTasks = projects
    .filter(project => tasks.some(task => task.projectId === project.id))
    .map(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      
      // Get parent tasks (those without a parent)
      const parentTasks = projectTasks.filter(task => !task.parentTaskId);
      
      // Get child tasks
      const childTasks = projectTasks.filter(task => task.parentTaskId);
      
      return {
        project,
        parentTasks,
        childTasks
      };
    });

  // Calculate total days based on view scale
  let totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;
  
  // Prepare data for the chart with hierarchy
  const chartData: TaskWithDetails[] = [];
  
  projectTasks.forEach(({ project, parentTasks, childTasks }) => {
    // Add project as header
    chartData.push({
      id: `project-${project.id}`,
      name: project.name,
      status: "project",
      start: 0,
      duration: totalDays,
      level: 0,
      color: "#6E59A5", // Project color
      task: {} as Task // Empty placeholder
    });
    
    // Add parent tasks
    parentTasks.forEach(task => {
      if (task.createdAt && task.dueDate) {
        const taskStartDate = parseISO(task.createdAt);
        const taskEndDate = parseISO(task.dueDate);
        
        const startDayOffset = differenceInDays(taskStartDate, projectStartDate);
        const duration = differenceInDays(taskEndDate, taskStartDate) + 1;
        
        chartData.push({
          id: task.id,
          name: task.title,
          status: task.status,
          start: startDayOffset,
          duration: duration > 0 ? duration : 1,
          level: 1,
          color: getColorForStatus(task.status),
          task: task
        });
        
        // Add child tasks of this parent
        const children = childTasks.filter(child => child.parentTaskId === task.id);
        children.forEach(childTask => {
          if (childTask.createdAt && childTask.dueDate) {
            const childStartDate = parseISO(childTask.createdAt);
            const childEndDate = parseISO(childTask.dueDate);
            
            const childStartDayOffset = differenceInDays(childStartDate, projectStartDate);
            const childDuration = differenceInDays(childEndDate, childStartDate) + 1;
            
            chartData.push({
              id: childTask.id,
              name: `↳ ${childTask.title}`,
              status: childTask.status,
              start: childStartDayOffset,
              duration: childDuration > 0 ? childDuration : 1,
              level: 2,
              color: getColorForStatus(childTask.status),
              task: childTask
            });
          }
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
  
  for (let i = 0; i <= totalDays; i += tickInterval) {
    dateTicks.push(i);
  }
  
  // Handle task click to edit
  const handleTaskClick = (taskData: any) => {
    const task = taskData.task;
    if (task && task.id) {
      setSelectedTask(task);
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
    { status: "project", color: "#6E59A5", label: "Project" },
    { status: "backlog", color: "#9CA3AF", label: "Backlog" },
    { status: "todo", color: "#60A5FA", label: "To Do" },
    { status: "in-progress", color: "#F59E0B", label: "In Progress" },
    { status: "review", color: "#EC4899", label: "Review" },
    { status: "done", color: "#10B981", label: "Done" }
  ];

  return (
    <div className="w-full h-[600px] mt-4">
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
          <div className="text-sm font-medium mr-2">Legend:</div>
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

      <ChartContainer 
        className="h-full w-full"
        config={{
          tasks: {
            theme: {
              light: "#60A5FA",
              dark: "#3B82F6"
            }
          }
        }}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          barGap={0}
          barSize={20}
          margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, totalDays]}
            ticks={dateTicks}
            tickFormatter={formatXAxis}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={140}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TaskWithDetails;
                
                // Don't show tooltip for project headers
                if (data.status === "project") {
                  return null;
                }
                
                const startDate = addDays(projectStartDate, data.start);
                const endDate = addDays(startDate, data.duration - 1);
                
                return (
                  <div className="bg-background border rounded-md p-3 shadow-lg">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-muted-foreground capitalize">Status: {data.status.replace("-", " ")}</p>
                    <p className="text-muted-foreground">
                      {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                    </p>
                    <p className="text-muted-foreground">Duration: {data.duration} day(s)</p>
                    {data.level !== 0 && (
                      <p className="text-xs text-blue-500 mt-1">Click to edit</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="duration" 
            name="Duration" 
            stackId="a" 
            fill="#60A5FA" 
            radius={[4, 4, 4, 4]} 
            minPointSize={3}
            background={{ fill: "#f3f4f6" }}
            fillOpacity={0.8}
            onClick={handleTaskClick}
            className="cursor-pointer"
            shape={(props: any) => {
              const { x, y, width, height, fill, payload } = props;
              const { id, start, duration, level, color, status } = payload;
              
              // Adjust the x position based on the start value
              const adjustedX = x + (start * (width / totalDays));
              const adjustedWidth = (duration / totalDays) * width;
              
              // Adjust height and y based on level (indent child tasks)
              const finalHeight = level === 0 ? height / 2 : height;
              const finalY = level === 0 ? y + height / 4 : y;
              
              // For project headers, show a different style
              if (status === "project") {
                return (
                  <g>
                    <rect
                      x={x}
                      y={finalY}
                      width={width}
                      height={finalHeight}
                      fill="#F3F4F6"
                      rx={0}
                      ry={0}
                      className="opacity-50"
                    />
                  </g>
                );
              }
              
              return (
                <rect
                  x={adjustedX}
                  y={finalY}
                  width={adjustedWidth}
                  height={finalHeight}
                  fill={color}
                  rx={4}
                  ry={4}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              );
            }}
          />
        </BarChart>
      </ChartContainer>
      
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
