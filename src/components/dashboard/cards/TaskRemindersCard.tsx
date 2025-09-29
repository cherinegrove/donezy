import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { Bell, Calendar } from "lucide-react";
import { isToday, parseISO, format } from "date-fns";
import { useState } from "react";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { Task } from "@/types";

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
              <div 
                key={task.id} 
                className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        Reminder today • {task.priority} priority
                      </p>
                      {task.dueDate && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due {format(new Date(task.dueDate), "MMM dd")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ml-2 ${
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