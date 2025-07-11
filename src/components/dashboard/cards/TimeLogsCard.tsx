import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Clock } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

export const TimeLogsCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { timeEntries, currentUser } = useAppContext();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekLogs = timeEntries.filter(entry => 
    entry.userId === currentUser?.id &&
    entry.startTime &&
    isWithinInterval(parseISO(entry.startTime), { start: weekStart, end: weekEnd })
  );

  const totalHours = thisWeekLogs.reduce((sum, entry) => 
    sum + (entry.duration || 0), 0
  );

  return (
    <DashboardCard
      title="My Time This Week"
      icon={<Clock className="h-4 w-4" />}
      onRemove={onRemove}
    >
      <div className="space-y-2">
        <div className="text-2xl font-bold">{(totalHours / 60).toFixed(1)}h</div>
        <div className="text-sm text-muted-foreground">
          {thisWeekLogs.length} entries
        </div>
        {thisWeekLogs.slice(0, 3).map((entry) => (
          <div key={entry.id} className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              {(entry.duration || 0) / 60}h - {entry.notes || "No notes"}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};