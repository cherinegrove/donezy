import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Bell } from "lucide-react";
import { isToday, parseISO, format } from "date-fns";

export const TaskRemindersCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();

  // Get tasks with reminder dates set for today
  const taskRemindersToday = tasks
    .filter(task => 
      (task.assigneeId === currentUser?.id || task.collaboratorIds?.includes(currentUser?.id)) &&
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

  return (
    <DashboardCard
      title="Task Reminders Today"
      icon={<Bell className="h-4 w-4" />}
      onRemove={onRemove}
    >
      {taskRemindersToday.length > 0 ? (
        <div className="space-y-2">
          {taskRemindersToday.slice(0, 5).map((task) => (
            <div key={task.id} className="p-2 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Reminder today • {task.priority} priority
                  </p>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority}
                </div>
              </div>
            </div>
          ))}
          {taskRemindersToday.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{taskRemindersToday.length - 5} more reminders
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No task reminders today</p>
      )}
    </DashboardCard>
  );
};