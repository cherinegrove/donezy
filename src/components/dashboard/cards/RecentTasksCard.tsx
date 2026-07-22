import { useAppContext } from "@/contexts/AppContext";
import { startOfWeek, isAfter, parseISO, format } from "date-fns";
import { useState, lazy } from "react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Task } from "@/types";

export const RecentTasksCard = () => {
  const { tasks, projects, users, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const recentlyUpdatedTasks = tasks
    .filter(task =>
      (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id)) &&
      task.createdAt &&
      isAfter(parseISO(task.createdAt), weekStart)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const CompactTaskRow = ({ task }: { task: Task }) => {
    const project = projects.find(p => p.id === task.projectId);
    const assignee = users.find(u => u.id === task.assigneeId);

    return (
      <div
        onClick={() => handleTaskClick(task)}
        className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer transition-colors border-b last:border-b-0 gap-4"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground">{project?.name || "No Project"}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
          {task.dueDate && <span>{format(parseISO(task.dueDate), "MMM dd")}</span>}
          {assignee && <span className="text-blue-600 dark:text-blue-400">{assignee.name}</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      {recentlyUpdatedTasks.length > 0 ? (
        <div className="space-y-0 max-h-40 overflow-y-auto">
          {recentlyUpdatedTasks.slice(0, 5).map((task) => (
            <CompactTaskRow key={task.id} task={task} />
          ))}
          {recentlyUpdatedTasks.length > 5 && (
            <p className="text-xs text-muted-foreground mt-2 px-3">
              +{recentlyUpdatedTasks.length - 5} more
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-center py-4 text-muted-foreground">No recent updates</p>
      )}

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