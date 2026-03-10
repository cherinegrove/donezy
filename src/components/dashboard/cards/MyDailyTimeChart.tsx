import { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameDay, format, subMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export const MyDailyTimeChart = () => {
  const { timeEntries, currentUser } = useAppContext();
  const [period, setPeriod] = useState<'this-month' | 'last-month'>('this-month');

  const chartData = useMemo(() => {
    if (!currentUser) return [];

    const now = new Date();
    const startDate = period === 'this-month' 
      ? startOfMonth(now) 
      : startOfMonth(subMonths(now, 1));
    const endDate = period === 'this-month' 
      ? endOfMonth(now) 
      : endOfMonth(subMonths(now, 1));

    // Filter to only current user's entries — match on authUserId (auth UUID) or userId
    const userEntries = timeEntries.filter(
      entry => (entry as any).authUserId === currentUser.auth_user_id || entry.userId === currentUser.auth_user_id
    );

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayEntries = userEntries.filter(entry => 
        isSameDay(parseISO(entry.startTime), day)
      );
      
      const totalHours = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'EEEE, MMM dd'),
        hours: Math.round(totalHours * 100) / 100
      };
    });
  }, [timeEntries, currentUser, period]);

  const totalHours = useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.hours, 0);
  }, [chartData]);

  if (!currentUser) return null;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            My Daily Hours
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{totalHours.toFixed(1)}h</span>
            </span>
            <Select value={period} onValueChange={(v: 'this-month' | 'last-month') => setPeriod(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={50}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Hours', 
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
                formatter={(value: number) => [`${value.toFixed(2)} hours`, 'Time Logged']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="hours"
                name="Hours Logged"
                stroke="#2a9d8f"
                strokeWidth={2.5}
                dot={{ fill: '#2a9d8f', r: 3 }}
                activeDot={{ r: 6, fill: '#2a9d8f' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No time entries for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
};
