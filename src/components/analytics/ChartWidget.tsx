import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { DrillDownDialog } from "./DrillDownDialog";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

interface ChartWidgetProps {
  type: 'bar' | 'line' | 'pie';
  data: any[];
  dataKey: string;
  nameKey: string;
  title?: string;
  onDataClick?: (data: any) => any[];
}

export const ChartWidget = ({ type, data, dataKey, nameKey, onDataClick }: ChartWidgetProps) => {
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [drillDownTitle, setDrillDownTitle] = useState("");

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
          status: item.status,
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
            fill="hsl(var(--primary))" 
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
