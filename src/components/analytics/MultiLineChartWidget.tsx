import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 80%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 65%, 55%)',
  'hsl(30, 80%, 50%)',
  'hsl(350, 70%, 50%)',
  'hsl(180, 60%, 45%)',
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
  return (
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
          formatter={(value: number) => [`${value.toFixed(2)} hrs`, '']}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="line"
        />
        {lineKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
