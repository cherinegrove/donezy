
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
  ResponsiveContainer 
} from "recharts";
import { format, differenceInDays, addDays, startOfDay, parseISO } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface GanttChartProps {
  tasks: Task[];
}

export function GanttChart({ tasks }: GanttChartProps) {
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
  const totalDays = differenceInDays(projectEndDate, projectStartDate) + 1;

  // Prepare data for the chart
  const data = tasksWithDates.map((task) => {
    const taskStartDate = parseISO(task.createdAt);
    const taskEndDate = parseISO(task.dueDate || task.createdAt);
    
    const startDayOffset = differenceInDays(taskStartDate, projectStartDate);
    const duration = differenceInDays(taskEndDate, taskStartDate) + 1;
    
    return {
      name: task.title,
      status: task.status,
      start: startDayOffset,
      duration: duration > 0 ? duration : 1, // Ensure minimum duration of 1 day
      color: getColorForStatus(task.status),
      id: task.id,
    };
  });

  // Generate x-axis ticks for dates
  const dateTicks = [];
  for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 10))) {
    dateTicks.push(i);
  }

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

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
        </div>
      );
    }
    return null;
  };

  // Format for X-axis ticks (dates)
  const formatXAxis = (value: number) => {
    const date = addDays(projectStartDate, value);
    return format(date, "MMM d");
  };

  return (
    <div className="w-full h-[600px] mt-4">
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
          data={data}
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
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="duration" 
            name="Duration" 
            stackId="a" 
            fill="#60A5FA" 
            radius={[4, 4, 4, 4]} 
            minPointSize={3}
            background={{ fill: "#f3f4f6" }}
            // Custom fill based on task status
            fillOpacity={0.8}
            shape={(props: any) => {
              const { x, y, width, height, fill, payload } = props;
              // Adjust the x position based on the start value
              const adjustedX = x + (payload.start * (width / totalDays));
              const adjustedWidth = (payload.duration / totalDays) * width;
              
              return (
                <rect
                  x={adjustedX}
                  y={y}
                  width={adjustedWidth}
                  height={height}
                  fill={payload.color}
                  rx={4}
                  ry={4}
                />
              );
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
