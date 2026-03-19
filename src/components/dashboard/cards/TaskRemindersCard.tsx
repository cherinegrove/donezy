import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Bell } from "lucide-react";
import { isToday, parseISO } from "date-fns";
import { useState, lazy, Suspense } from "react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";

export const TaskRemindersCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get tasks with reminder dates set for today
  const taskRemindersToday = tasks
    .filter(task => 
      (task.assigneeId === currentUser?.auth_user_id || task.collaboratorIds?.includes(currentUser?.auth_user_id)) &&
      task.reminderDate &&
      isToday(parseISO(task.reminderDate)) &&
      task.status !== "done"
    )
    .sort((a, b) => {
      // Sort by priority (high, medium, low)
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  return (
    <>
      <DashboardCard
        title="Task Reminders Today"
        icon={<Bell className="h-4 w-4" />}
        onRemove={onRemove}
      >
        {taskRemindersToday.length > 0 ? (
          <div className="space-y-2">
            {taskRemindersToday.slice(0, 5).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
              />
            ))}
            {taskRemindersToday.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{taskRemindersToday.length - 5} more reminders
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No task reminders today</p>
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