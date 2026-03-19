import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Activity } from "lucide-react";
import { startOfWeek, isAfter, parseISO } from "date-fns";
import { useState, lazy, Suspense } from "react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";

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
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
              />
            ))}
            {recentlyUpdatedTasks.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
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