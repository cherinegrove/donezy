import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { DrillDownDialog } from "./DrillDownDialog";
import { useAppContext } from "@/contexts/AppContext";

// Enhanced color palette with better contrast and visual hierarchy
const COLORS = [
  'hsl(217, 91%, 60%)',   // Primary blue
  'hsl(142, 76%, 36%)',   // Success green
  'hsl(39, 89%, 49%)',    // Warning amber
  'hsl(0, 84%, 60%)',     // Destructive red
  'hsl(280, 85%, 53%)',   // Purple
  'hsl(15, 86%, 63%)',    // Orange
  'hsl(190, 95%, 39%)',   // Cyan
  'hsl(261, 80%, 50%)',   // Violet
  'hsl(346, 77%, 50%)',   // Rose
  'hsl(22, 96%, 47%)',    // Teal
];

interface ChartWidgetProps {
  type: 'bar' | 'line' | 'pie' | 'stacked-bar';
  data: any[];
  dataKey: string;
  nameKey: string;
  title?: string;
  onDataClick?: (data: any) => any[];
  stackedDataKeys?: string[]; // For stacked bar charts: array of keys to stack
}

export const ChartWidget = ({ type, data, dataKey, nameKey, onDataClick, stackedDataKeys }: ChartWidgetProps) => {
  const { taskStatuses } = useAppContext();
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [drillDownTitle, setDrillDownTitle] = useState("");

  // Determine data keys for stacked bar charts
  const barDataKeys = useMemo(() => {
    if (stackedDataKeys && stackedDataKeys.length > 0) {
      return stackedDataKeys;
    }
    if (type === 'stacked-bar' && data.length > 0) {
      // Extract all keys except the nameKey
      const firstItem = data[0];
      return Object.keys(firstItem).filter(key => key !== nameKey && key !== 'name' && typeof firstItem[key] === 'number');
    }
    return [];
  }, [type, data, nameKey, stackedDataKeys]);

  const getStatusLabel = (status: string) => {
    return taskStatuses.find(s => s.value === status)?.label || status;
  };

  const handleClick = (data: any) => {
    if (!onDataClick) return;
    
    const items = onDataClick(data);
    if (!items || items.length === 0) return;

    // Transform items based on type
    const transformedItems = items.map((item: any) => {
      if (item.title) {
        // Task or Project
        return {
          id: item.id,
          name: item.title || item.name,
          status: item.status ? getStatusLabel(item.status) : undefined,
          value: item.estimatedHours || item.allocatedHours,
          metadata: {
            ...(item.priority && { Priority: item.priority }),
            ...(item.assigneeId && { Assignee: item.assigneeId }),
            ...(item.dueDate && { "Due Date": new Date(item.dueDate).toLocaleDateString() }),
          },
          path: item.title ? `/tasks/${item.id}` : `/projects/${item.id}`
        };
      } else if (item.startTime) {
        // Time Entry
        return {
          id: item.id,
          name: `Time Entry - ${new Date(item.startTime).toLocaleString()}`,
          value: Math.round((item.duration || 0) / 60),
          metadata: {
            Duration: `${Math.round((item.duration || 0) / 60)} min`,
            ...(item.notes && { Notes: item.notes }),
          },
          path: `/time-tracking`
        };
      }
      return {
        id: item.id,
        name: item.name,
        value: item.value,
      };
    });

    setDrillDownData(transformedItems);
    setDrillDownTitle(`${data.name || data[nameKey]} Details`);
    setDrillDownOpen(true);
  };
  if (type === 'pie') {
    return (
      <>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              onClick={handleClick}
              className="cursor-pointer"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              cursor={{ fill: 'hsl(var(--accent))' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <DrillDownDialog
          open={drillDownOpen}
          onOpenChange={setDrillDownOpen}
          title={drillDownTitle}
          items={drillDownData}
        />
      </>
    );
  }

  if (type === 'line') {
    return (
      <>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={nameKey} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              cursor={{ stroke: 'hsl(var(--accent))' }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', cursor: 'pointer' }}
              onClick={handleClick}
              className="cursor-pointer"
            />
          </LineChart>
        </ResponsiveContainer>
        <DrillDownDialog
          open={drillDownOpen}
          onOpenChange={setDrillDownOpen}
          title={drillDownTitle}
          items={drillDownData}
        />
      </>
    );
  }

  // Stacked or multi-series bar chart
  if (type === 'stacked-bar' || barDataKeys.length > 1) {
    return (
      <>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey={nameKey}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              angle={barDataKeys.length > 3 ? -45 : 0}
              textAnchor={barDataKeys.length > 3 ? "end" : "middle"}
              height={barDataKeys.length > 3 ? 80 : 30}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
              formatter={(value) => typeof value === 'number' ? value.toFixed(1) : value}
            />
            {barDataKeys.length > 0 && <Legend />}
            {barDataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={type === 'stacked-bar' ? "stack" : undefined}
                fill={COLORS[index % COLORS.length]}
                radius={type === 'stacked-bar' ? undefined : [8, 8, 0, 0]}
                onClick={handleClick}
                className="cursor-pointer transition-all hover:opacity-80"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <DrillDownDialog
          open={drillDownOpen}
          onOpenChange={setDrillDownOpen}
          title={drillDownTitle}
          items={drillDownData}
        />
      </>
    );
  }

  // Default single bar chart
  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={nameKey} stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            cursor={{ fill: 'hsl(var(--accent))' }}
          />
          <Bar
            dataKey={dataKey}
            fill={COLORS[0]}
            radius={[8, 8, 0, 0]}
            onClick={handleClick}
            className="cursor-pointer"
          />
        </BarChart>
      </ResponsiveContainer>
      <DrillDownDialog
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        title={drillDownTitle}
        items={drillDownData}
      />
    </>
  );
};
