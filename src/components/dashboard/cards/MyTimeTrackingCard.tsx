import { useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, parseISO } from "date-fns";

export const MyTimeTrackingCard = () => {
  const { timeEntries, currentUser } = useAppContext();

  const userTimeEntries = useMemo(() => {
    if (!currentUser) return [];
    return timeEntries.filter(entry => entry.userId === currentUser.auth_user_id && entry.status === 'approved');
  }, [timeEntries, currentUser]);

  const calculatePeriodData = (startDate: Date, endDate: Date) => {
    const entries = userTimeEntries.filter(entry => {
      const entryDate = parseISO(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });

    const totalHours = entries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    const byProject = entries.reduce((acc, entry) => {
      const projectId = entry.projectId || 'No Project';
      if (!acc[projectId]) {
        acc[projectId] = { hours: 0, count: 0 };
      }
      acc[projectId].hours += entry.duration || 0;
      acc[projectId].count += 1;
      return acc;
    }, {} as Record<string, { hours: number; count: number }>);

    return {
      totalHours: (totalHours / 3600).toFixed(2),
      entries: entries.length,
      byProject
    };
  };

  const now = new Date();
  
  const todayData = calculatePeriodData(startOfDay(now), endOfDay(now));
  const thisWeekData = calculatePeriodData(startOfWeek(now), endOfWeek(now));
  const thisMonthData = calculatePeriodData(startOfMonth(now), endOfMonth(now));
  
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));
  const lastWeekData = calculatePeriodData(lastWeekStart, lastWeekEnd);
  
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const lastMonthData = calculatePeriodData(lastMonthStart, lastMonthEnd);

  const PeriodDisplay = ({ title, data, icon: Icon }: { title: string; data: any; icon: any }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="pl-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Hours:</span>
          <Badge variant="secondary" className="font-mono">
            {data.totalHours}h
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Time Entries:</span>
          <Badge variant="outline">{data.entries}</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          My Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Periods</TabsTrigger>
            <TabsTrigger value="past">Past Periods</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4 mt-4">
            <PeriodDisplay title="Today" data={todayData} icon={Clock} />
            <div className="border-t pt-3">
              <PeriodDisplay title="This Week" data={thisWeekData} icon={Calendar} />
            </div>
            <div className="border-t pt-3">
              <PeriodDisplay title="This Month" data={thisMonthData} icon={TrendingUp} />
            </div>
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-4">
            <PeriodDisplay title="Last Week" data={lastWeekData} icon={Calendar} />
            <div className="border-t pt-3">
              <PeriodDisplay title="Last Month" data={lastMonthData} icon={TrendingUp} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
