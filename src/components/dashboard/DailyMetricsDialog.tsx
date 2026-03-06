import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { Calendar, AlertTriangle, Bell, ChevronRight, ListTodo } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DailyMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyMetricsDialog({ open, onOpenChange }: DailyMetricsDialogProps) {
  const { tasks, currentUser, taskStatuses } = useAppContext();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Filter tasks for current user
  const userTasks = tasks.filter(
    (task) =>
      task.assigneeId === currentUser?.id ||
      task.collaboratorIds?.includes(currentUser?.id || "")
  );

  // All active tasks (not done)
  const activeTasks = userTasks.filter((task) => task.status !== "done");

  // Calculate metrics
  const tasksDueToday = userTasks.filter((task) => {
    if (!task.dueDate) return false;
    return isToday(new Date(task.dueDate)) && task.status !== "done";
  });

  const tasksOverdue = userTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = startOfDay(new Date(task.dueDate));
    const today = startOfDay(new Date());
    return isBefore(dueDate, today) && task.status !== "done";
  });

  // Mock unread notifications count (you can replace with actual notification data)
  const unreadNotifications: number = 0; // Replace with actual unread count from your notifications system

  const handleSectionClick = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
    onOpenChange(false);
  };

  const handleViewAll = (type: string) => {
    switch (type) {
      case "active":
        navigate("/tasks?filter=my_tasks");
        break;
      case "today":
        navigate("/tasks?filter=due_today");
        break;
      case "overdue":
        navigate("/tasks?filter=overdue");
        break;
      case "notifications":
        navigate("/notifications");
        break;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Good day! Here's your overview</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {/* All Active Tasks */}
            <Card
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSectionClick("active")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ListTodo className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">All Active Tasks</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} assigned to you
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-3">
                    {activeTasks.length}
                  </Badge>
                  <ChevronRight
                    className={`h-5 w-5 transition-transform ${
                      expandedSection === "active" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {expandedSection === "active" && activeTasks.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {activeTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task.id);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {taskStatuses.find(s => s.value === task.status)?.label || task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline" className="mr-2">
                              {task.priority}
                            </Badge>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {activeTasks.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAll("active");
                      }}
                    >
                      View all {activeTasks.length} tasks
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Tasks Due Today */}
            <Card
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSectionClick("today")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tasks Due Today</h3>
                    <p className="text-sm text-muted-foreground">
                      {tasksDueToday.length} {tasksDueToday.length === 1 ? "task needs" : "tasks need"} attention
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-3">
                    {tasksDueToday.length}
                  </Badge>
                  <ChevronRight
                    className={`h-5 w-5 transition-transform ${
                      expandedSection === "today" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {expandedSection === "today" && tasksDueToday.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {tasksDueToday.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task.id);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.priority && (
                            <Badge variant="outline" className="mr-2">
                              {task.priority}
                            </Badge>
                          )}
                          {task.dueDate && format(new Date(task.dueDate), "p")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {tasksDueToday.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAll("today");
                      }}
                    >
                      View all {tasksDueToday.length} tasks
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Tasks Overdue */}
            <Card
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSectionClick("overdue")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tasks Overdue</h3>
                    <p className="text-sm text-muted-foreground">
                      {tasksOverdue.length} task{tasksOverdue.length !== 1 ? "s" : ""} past due date
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-lg px-3">
                    {tasksOverdue.length}
                  </Badge>
                  <ChevronRight
                    className={`h-5 w-5 transition-transform ${
                      expandedSection === "overdue" ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {expandedSection === "overdue" && tasksOverdue.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {tasksOverdue.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-background/50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task.id);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.priority && (
                            <Badge variant="outline" className="mr-2">
                              {task.priority}
                            </Badge>
                          )}
                          Due {task.dueDate && format(new Date(task.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                  {tasksOverdue.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAll("overdue");
                      }}
                    >
                      View all {tasksOverdue.length} tasks
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Unread Notifications */}
            <Card
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSectionClick("notifications")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Bell className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Unread Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      {unreadNotifications} new notification{unreadNotifications !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-3">
                    {unreadNotifications}
                  </Badge>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            You'll see this summary once per day
          </p>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
