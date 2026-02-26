import { useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  subWeeks, subMonths, subYears, format, parseISO, isWithinInterval,
  eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay,
} from "date-fns";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeEntry {
  id: string;
  startTime: string;
  duration: number;
}

interface BusinessHoursWidgetProps {
  timeEntries: TimeEntry[];
}

const getTotalHours = (entries: TimeEntry[], from: Date, to: Date) => {
  const mins = entries
    .filter(e => {
      const d = parseISO(e.startTime);
      return isWithinInterval(d, { start: from, end: to });
    })
    .reduce((sum, e) => sum + (e.duration || 0), 0);
  return Math.round((mins / 60) * 10) / 10;
};

const TrendBadge = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
  const up = pct > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${up ? "text-green-500" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct}% vs prior period
    </span>
  );
};

const PeriodCard = ({
  label, current, previous, currentLabel, previousLabel
}: {
  label: string; current: number; previous: number;
  currentLabel: string; previousLabel: string;
}) => (
  <div className="p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/50 transition-all">
    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">{label}</p>
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">{currentLabel}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{current}</span>
          <span className="text-sm text-muted-foreground">hrs</span>
        </div>
        <TrendBadge current={current} previous={previous} />
      </div>
      <div className="border-t border-border/50 pt-2">
        <p className="text-xs text-muted-foreground">{previousLabel}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-semibold text-muted-foreground">{previous}</span>
          <span className="text-xs text-muted-foreground">hrs</span>
        </div>
      </div>
    </div>
  </div>
);

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.25)",
  "hsl(var(--primary) / 0.15)",
];

export const BusinessHoursWidget = ({ timeEntries }: BusinessHoursWidgetProps) => {
  const now = new Date();

  const periods = useMemo(() => {
    // Week on Week
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    // Month on Month
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Year on Year
    const thisYearStart = startOfYear(now);
    const thisYearEnd = endOfYear(now);
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = endOfYear(subYears(now, 1));

    return {
      week: {
        current: getTotalHours(timeEntries, thisWeekStart, thisWeekEnd),
        previous: getTotalHours(timeEntries, lastWeekStart, lastWeekEnd),
        currentLabel: `This Week (${format(thisWeekStart, "MMM d")} – ${format(thisWeekEnd, "MMM d")})`,
        previousLabel: `Last Week (${format(lastWeekStart, "MMM d")} – ${format(lastWeekEnd, "MMM d")})`,
      },
      month: {
        current: getTotalHours(timeEntries, thisMonthStart, thisMonthEnd),
        previous: getTotalHours(timeEntries, lastMonthStart, lastMonthEnd),
        currentLabel: format(thisMonthStart, "MMMM yyyy"),
        previousLabel: format(lastMonthStart, "MMMM yyyy"),
      },
      year: {
        current: getTotalHours(timeEntries, thisYearStart, thisYearEnd),
        previous: getTotalHours(timeEntries, lastYearStart, lastYearEnd),
        currentLabel: `${format(thisYearStart, "yyyy")} (YTD)`,
        previousLabel: format(lastYearStart, "yyyy"),
      },
    };
  }, [timeEntries]);

  // Weekly bar chart — last 8 weeks
  const weeklyChartData = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 7), end: endOfWeek(now, { weekStartsOn: 1 }) },
      { weekStartsOn: 1 }
    );
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return {
        label: format(weekStart, "MMM d"),
        hours: getTotalHours(timeEntries, weekStart, weekEnd),
        isCurrent: format(weekStart, "yyyy-ww") === format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-ww"),
      };
    });
  }, [timeEntries]);

  // Monthly bar chart — last 12 months
  const monthlyChartData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(subMonths(now, 11)),
      end: endOfMonth(now),
    });
    return months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      return {
        label: format(monthStart, "MMM yy"),
        hours: getTotalHours(timeEntries, monthStart, monthEnd),
        isCurrent: format(monthStart, "yyyy-MM") === format(now, "yyyy-MM"),
      };
    });
  }, [timeEntries]);

  // Yearly bar chart — last 3 years
  const yearlyChartData = useMemo(() => {
    return [2, 1, 0].map(yearsAgo => {
      const yr = subYears(now, yearsAgo);
      const s = startOfYear(yr);
      const e = yearsAgo === 0 ? now : endOfYear(yr);
      return {
        label: format(s, "yyyy"),
        hours: getTotalHours(timeEntries, s, e),
        isCurrent: yearsAgo === 0,
      };
    });
  }, [timeEntries]);

  const BarChartPanel = ({ data }: { data: { label: string; hours: number; isCurrent: boolean }[] }) => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          formatter={(v: number) => [`${v} hrs`, "Hours"]}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isCurrent ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <PeriodCard
          label="Week on Week"
          current={periods.week.current}
          previous={periods.week.previous}
          currentLabel={periods.week.currentLabel}
          previousLabel={periods.week.previousLabel}
        />
        <PeriodCard
          label="Month on Month"
          current={periods.month.current}
          previous={periods.month.previous}
          currentLabel={periods.month.currentLabel}
          previousLabel={periods.month.previousLabel}
        />
        <PeriodCard
          label="Year on Year"
          current={periods.year.current}
          previous={periods.year.previous}
          currentLabel={periods.year.currentLabel}
          previousLabel={periods.year.previousLabel}
        />
      </div>

      {/* Trend charts */}
      <Tabs defaultValue="weekly">
        <TabsList className="mb-3">
          <TabsTrigger value="weekly">Weekly Trend</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Trend</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <p className="text-xs text-muted-foreground mb-2">Last 8 weeks — current week highlighted</p>
          <BarChartPanel data={weeklyChartData} />
        </TabsContent>
        <TabsContent value="monthly">
          <p className="text-xs text-muted-foreground mb-2">Last 12 months — current month highlighted</p>
          <BarChartPanel data={monthlyChartData} />
        </TabsContent>
        <TabsContent value="yearly">
          <p className="text-xs text-muted-foreground mb-2">Last 3 years — current year highlighted (YTD)</p>
          <BarChartPanel data={yearlyChartData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
