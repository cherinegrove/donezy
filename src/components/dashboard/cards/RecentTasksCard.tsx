import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Activity } from "lucide-react";
import { startOfWeek, isAfter, parseISO } from "date-fns";

export const RecentTasksCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const recentlyUpdatedTasks = tasks
    .filter(task => 
      (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id)) &&
      task.createdAt &&
      isAfter(parseISO(task.createdAt), weekStart)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <DashboardCard
      title="Tasks Updated This Week"
      icon={<Activity className="h-4 w-4" />}
      onRemove={onRemove}
    >
      {recentlyUpdatedTasks.length > 0 ? (
        <div className="space-y-2">
          {recentlyUpdatedTasks.slice(0, 5).map((task) => (
            <div key={task.id} className="p-2 bg-muted rounded-md">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.status}</p>
            </div>
          ))}
          {recentlyUpdatedTasks.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{recentlyUpdatedTasks.length - 5} more
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No recent updates</p>
      )}
    </DashboardCard>
  );
};