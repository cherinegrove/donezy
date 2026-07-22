import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonth, getYear, startOfMonth, endOfMonth } from "date-fns";
import { useMemo } from "react";

export function MonthlyComparisonChart() {
  const { timeEntries, currentUser } = useAppContext();

  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthStart = startOfMonth(new Date(currentYear, i, 1));
      const monthEnd = endOfMonth(monthStart);

      const monthHours = (timeEntries || [])
        .filter(
          (entry) =>
            entry.userId === currentUser?.id &&
            new Date(entry.startTime) >= monthStart &&
            new Date(entry.startTime) <= monthEnd
        )
        .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60; // convert to hours

      return {
        month: monthStart.toLocaleString("default", { month: "short" }),
        hours: Math.round(monthHours * 10) / 10, // round to 1 decimal
      };
    });

    return months;
  }, [timeEntries, currentUser?.id]);

  const maxHours = Math.max(...monthlyData.map((m) => m.hours), 40);
  const totalHours = monthlyData.reduce((sum, m) => sum + m.hours, 0);
  const averageHours = Math.round((totalHours / 12) * 10) / 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Time Tracked - Year Overview</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Total: {totalHours}h | Average: {averageHours}h/month
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-32">
            {monthlyData.map((month, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                <div className="relative h-24 w-full flex items-end justify-center">
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer"
                    style={{
                      height: `${(month.hours / maxHours) * 100}%`,
                      minHeight: month.hours > 0 ? "4px" : "0px",
                    }}
                    title={`${month.month}: ${month.hours}h`}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground text-center">
                  {month.month}
                </span>
                <span className="text-xs font-semibold text-foreground">{month.hours}h</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total Year</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{averageHours}h</p>
              <p className="text-xs text-muted-foreground">Avg/Month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {monthlyData[new Date().getMonth()].hours}h
              </p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
