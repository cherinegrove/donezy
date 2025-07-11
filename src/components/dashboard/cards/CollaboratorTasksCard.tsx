import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Users } from "lucide-react";

export const CollaboratorTasksCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();

  const collaboratorTasks = tasks.filter(task => 
    task.collaboratorIds?.includes(currentUser?.id) && 
    task.assigneeId !== currentUser?.id &&
    task.status !== "done"
  );

  return (
    <DashboardCard
      title="Tasks I'm Collaborating On"
      icon={<Users className="h-4 w-4" />}
      onRemove={onRemove}
    >
      {collaboratorTasks.length > 0 ? (
        <div className="space-y-2">
          {collaboratorTasks.slice(0, 5).map((task) => (
            <div key={task.id} className="p-2 bg-muted rounded-md">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.status}</p>
            </div>
          ))}
          {collaboratorTasks.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{collaboratorTasks.length - 5} more
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No collaboration tasks</p>
      )}
    </DashboardCard>
  );
};