import { useAppContext } from "@/contexts/AppContext";
import { DashboardCard } from "../DashboardCard";
import { CalendarDays } from "lucide-react";
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { useState, lazy, Suspense } from "react";
const EditTaskDialog = lazy(() => import("@/components/tasks/EditTaskDialog").then(m => ({ default: m.EditTaskDialog })));
import { Task } from "@/types";
import { TaskCard } from "@/components/tasks/TaskCard";

export const MyWeekCard = ({ onRemove }: { onRemove?: () => void }) => {
  const { tasks, currentUser } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Week starts on Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const tasksThisWeek = tasks
    .filter(task => {
      // Filter for current user's tasks
      const isMyTask = task.assigneeId === currentUser?.auth_user_id || 
                       task.collaboratorIds?.includes(currentUser?.auth_user_id);
      
      // Filter for tasks with due dates this week
      const hasDueDateThisWeek = task.dueDate && 
        isWithinInterval(parseISO(task.dueDate), { start: weekStart, end: weekEnd });
      
      // Exclude completed tasks
      const isNotDone = task.status !== "done";
      
      return isMyTask && hasDueDateThisWeek && isNotDone;
    })
    .sort((a, b) => {
      // Sort by due date
      if (!a.dueDate || !b.dueDate) return 0;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  return (
    <>
      <DashboardCard
        title="My Week"
        icon={<CalendarDays className="h-4 w-4" />}
        onRemove={onRemove}
      >
        {tasksThisWeek.length > 0 ? (
          <div className="space-y-2">
            {tasksThisWeek.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                displayOptions={["priority", "project", "client", "assignee", "dueDate"]}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tasks due this week</p>
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
