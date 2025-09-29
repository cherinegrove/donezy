import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Activity, Calendar } from "lucide-react";
import { startOfWeek, isAfter, parseISO, format } from "date-fns";
import { useState } from "react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";

export const RecentTasksCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const recentlyUpdatedTasks = tasks
    .filter(task => 
      (task.assigneeId === currentUser?.auth_user_id || task.collaboratorIds?.includes(currentUser?.auth_user_id)) &&
      task.createdAt &&
      isAfter(parseISO(task.createdAt), weekStart)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  return (
    <>
      <DashboardCard
        title="Tasks Updated This Week"
        icon={<Activity className="h-4 w-4" />}
        onRemove={onRemove}
      >
        {recentlyUpdatedTasks.length > 0 ? (
          <div className="space-y-2">
            {recentlyUpdatedTasks.slice(0, 5).map((task) => (
              <div 
                key={task.id} 
                className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleTaskClick(task)}
              >
                <p className="text-sm font-medium">{task.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{task.status}</p>
                  {task.dueDate && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(task.dueDate), "MMM dd")}
                    </div>
                  )}
                </div>
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
      
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
};