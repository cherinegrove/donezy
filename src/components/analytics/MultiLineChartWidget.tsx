import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Highly distinct, vibrant colors
const CHART_COLORS = [
  '#e63946', // Red
  '#2a9d8f', // Teal
  '#e9c46a', // Yellow
  '#264653', // Dark Blue
  '#f4a261', // Orange
  '#9b5de5', // Purple
  '#00bbf9', // Cyan
  '#00f5d4', // Mint
  '#f15bb5', // Pink
  '#fee440', // Bright Yellow
  '#8338ec', // Violet
  '#3a86ff', // Blue
];

interface MultiLineChartWidgetProps {
  data: Record<string, any>[];
  lineKeys: string[];
  xAxisKey: string;
  yAxisLabel?: string;
}

export const MultiLineChartWidget = ({ 
  data, 
  lineKeys, 
  xAxisKey, 
  yAxisLabel = "Hours" 
}: MultiLineChartWidgetProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>(lineKeys.slice(0, 5));

  const toggleUser = (userName: string) => {
    setSelectedUsers(prev => 
      prev.includes(userName) 
        ? prev.filter(u => u !== userName)
        : [...prev, userName]
    );
  };

  const selectAll = () => setSelectedUsers([...lineKeys]);
  const selectNone = () => setSelectedUsers([]);

  return (
    <div className="space-y-4">
      {/* User selector */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Select Users</span>
          <div className="flex gap-2">
            <button 
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              All
            </button>
            <span className="text-muted-foreground">|</span>
            <button 
              onClick={selectNone}
              className="text-xs text-primary hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <ScrollArea className="max-h-24">
          <div className="flex flex-wrap gap-3">
            {lineKeys.map((userName, index) => (
              <div key={userName} className="flex items-center gap-2">
                <Checkbox 
                  id={`user-${userName}`}
                  checked={selectedUsers.includes(userName)}
                  onCheckedChange={() => toggleUser(userName)}
                />
                <Label 
                  htmlFor={`user-${userName}`} 
                  className="text-sm cursor-pointer flex items-center gap-1.5"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {userName}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chart */}
      {selectedUsers.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 12 }}
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              cursor={{ stroke: 'hsl(var(--accent))' }}
              formatter={(value: number, name: string) => [`${value.toFixed(2)} hrs`, name]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            {lineKeys.map((key, index) => (
              selectedUsers.includes(key) && (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[350px] text-muted-foreground">
          Select at least one user to display
        </div>
      )}
    </div>
  );
};
