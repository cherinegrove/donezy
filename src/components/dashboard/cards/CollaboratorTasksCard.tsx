import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Users } from "lucide-react";
import { useState } from "react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";

export const CollaboratorTasksCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const collaboratorTasks = tasks.filter(task => 
    task.collaboratorIds?.includes(currentUser?.auth_user_id) && 
    task.assigneeId !== currentUser?.auth_user_id &&
    task.status !== "done"
  );

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  return (
    <>
      <DashboardCard
        title="Tasks I'm Collaborating On"
        icon={<Users className="h-4 w-4" />}
        onRemove={onRemove}
      >
        {collaboratorTasks.length > 0 ? (
          <div className="space-y-2">
            {collaboratorTasks.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
              />
            ))}
            {collaboratorTasks.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{collaboratorTasks.length - 5} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No collaboration tasks</p>
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