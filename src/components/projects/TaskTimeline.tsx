import { useMemo, useRef, useState } from "react";
import { Task } from "@/types";
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isValid, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";
import { AlertCircle, Calendar, CheckCircle2, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface TaskTimelineProps {
  tasks: Task[];
  projectId: string;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  tasks: Task[];
  isCurrentWeek: boolean;
  isPast: boolean;
}

export function TaskTimeline({ tasks, projectId }: TaskTimelineProps) {
  const { users, projects } = useAppContext();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const project = projects.find(p => p.id === projectId);

  // Generate 12-week timeline starting from next week
  const twelveWeekData = useMemo(() => {
    const today = new Date();
    const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
    
    const tasksWithDueDates = tasks.filter(task => {
      if (!task.dueDate || task.dueDate.trim() === "") return false;
      try {
        const date = new Date(task.dueDate);
        return isValid(date);
      } catch {
        return false;
      }
    });

    const weeks: WeekData[] = [];
    let currentWeek = nextWeekStart;
    
    for (let i = 0; i < 12; i++) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekTasks = tasksWithDueDates.filter(task => {
        const dueDate = new Date(task.dueDate!);
        return isWithinInterval(dueDate, { start: currentWeek, end: weekEnd });
      });

      weeks.push({
        weekStart: currentWeek,
        weekEnd,
        label: format(currentWeek, "MMM d") + " - " + format(weekEnd, "MMM d"),
        tasks: weekTasks,
        isCurrentWeek: false,
        isPast: false,
      });

      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [tasks]);

  const timelineData = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    const tasksWithDueDates = tasks.filter(task => {
      if (!task.dueDate || task.dueDate.trim() === "") return false;
      try {
        const date = new Date(task.dueDate);
        return isValid(date);
      } catch {
        return false;
      }
    });

    let minDate = currentWeekStart;
    let maxDate = addWeeks(currentWeekStart, 8);

    tasksWithDueDates.forEach(task => {
      const dueDate = new Date(task.dueDate!);
      if (isBefore(dueDate, minDate)) minDate = startOfWeek(dueDate, { weekStartsOn: 1 });
      if (dueDate > maxDate) maxDate = endOfWeek(dueDate, { weekStartsOn: 1 });
    });

    minDate = isBefore(addWeeks(currentWeekStart, -2), minDate) 
      ? addWeeks(currentWeekStart, -2) 
      : minDate;
    maxDate = addWeeks(currentWeekStart, 8) > maxDate 
      ? addWeeks(currentWeekStart, 8) 
      : maxDate;

    const weeks: WeekData[] = [];
    let currentWeek = startOfWeek(minDate, { weekStartsOn: 1 });
    
    while (isBefore(currentWeek, maxDate) || currentWeek.getTime() === maxDate.getTime()) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekTasks = tasksWithDueDates.filter(task => {
        const dueDate = new Date(task.dueDate!);
        return isWithinInterval(dueDate, { start: currentWeek, end: weekEnd });
      });

      weeks.push({
        weekStart: currentWeek,
        weekEnd,
        label: format(currentWeek, "MMM d") + " - " + format(weekEnd, "MMM d"),
        tasks: weekTasks,
        isCurrentWeek: isWithinInterval(today, { start: currentWeek, end: weekEnd }),
        isPast: isBefore(weekEnd, today),
      });

      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [tasks]);

  const tasksNoDueDate = tasks.filter(task => !task.dueDate || task.dueDate.trim() === "");

  const getAssigneeName = (assigneeId: string | null | undefined) => {
    if (!assigneeId) return "Unassigned";
    const user = users.find(u => u.id === assigneeId);
    return user?.name || "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "awaiting-feedback":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIndicator = (priority: string) => {
    if (priority === "urgent") {
      return <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-1.5" />;
    }
    return null;
  };

  const handleExportImage = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `${project?.name || "project"}-timeline-${format(new Date(), "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Timeline exported as image");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export timeline");
    } finally {
      setIsExporting(false);
    }
  };

  const totalTasksScheduled = timelineData.reduce((sum, week) => sum + week.tasks.length, 0);
  const avgTasksPerWeek = timelineData.length > 0 
    ? (totalTasksScheduled / timelineData.filter(w => !w.isPast).length).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scheduled Tasks</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalTasksScheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Tasks/Week</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgTasksPerWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No Due Date</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tasksNoDueDate.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Timeline Weeks</span>
            </div>
            <p className="text-2xl font-bold mt-1">{timelineData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Task Timeline by Week
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportImage}
            disabled={isExporting}
            className="w-fit"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export 12-Week Snapshot"}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4" style={{ minWidth: `${timelineData.length * 220}px` }}>
              {timelineData.map((week, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-52 rounded-lg border p-3 ${
                    week.isCurrentWeek 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : week.isPast 
                        ? "border-muted bg-muted/30 opacity-60" 
                        : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-medium ${week.isCurrentWeek ? "text-primary" : ""}`}>
                      {week.label}
                    </span>
                    {week.isCurrentWeek && (
                      <Badge variant="default" className="text-xs">Now</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 min-h-[100px]">
                    {week.tasks.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <div className="text-2xl mb-1">📭</div>
                        No tasks
                      </div>
                    ) : (
                      week.tasks.map(task => (
                        <div
                          key={task.id}
                          className={`p-2 rounded border text-sm ${
                            task.status === "done"
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                              : task.priority === "urgent"
                                ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                : "bg-background border-border"
                          }`}
                        >
                          <div className="flex items-start gap-1">
                            {getPriorityIndicator(task.priority)}
                            <span className="font-medium text-xs line-clamp-2">{task.title}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                              {getAssigneeName(task.assigneeId)}
                            </span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(task.status)}`}>
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {week.tasks.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                      {week.tasks.length} task{week.tasks.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Hidden export container - 12 weeks starting next week */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={exportRef} 
          className="p-8 bg-white"
          style={{ width: "2640px" }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{project?.name || "Project"} - 12 Week Timeline</h1>
            <p className="text-gray-500 mt-1">
              {format(twelveWeekData[0]?.weekStart || new Date(), "MMMM d, yyyy")} - {format(twelveWeekData[11]?.weekEnd || new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-3">
            {twelveWeekData.map((week, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-52 rounded-lg border border-gray-200 p-3 bg-white"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {week.label}
                  </span>
                  <span className="text-xs text-gray-400">Wk {index + 1}</span>
                </div>
                
                <div className="space-y-2 min-h-[120px]">
                  {week.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tasks
                    </div>
                  ) : (
                    week.tasks.slice(0, 5).map(task => (
                      <div
                        key={task.id}
                        className={`p-2 rounded border text-sm ${
                          task.status === "done"
                            ? "bg-green-50 border-green-200"
                            : task.priority === "urgent"
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          {task.priority === "urgent" && (
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-1 mt-0.5" />
                          )}
                          <span className="font-medium text-xs text-gray-900 line-clamp-2">{task.title}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">
                            {getAssigneeName(task.assigneeId)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {week.tasks.length > 5 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{week.tasks.length - 5} more
                    </div>
                  )}
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 text-center font-medium">
                  {week.tasks.length} task{week.tasks.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks without due dates */}
      {tasksNoDueDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-5 w-5" />
              Tasks Without Due Dates ({tasksNoDueDate.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasksNoDueDate.map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded border ${
                    task.priority === "urgent"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-start gap-1">
                    {getPriorityIndicator(task.priority)}
                    <span className="font-medium text-sm">{task.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {getAssigneeName(task.assigneeId)}
                    </span>
                    <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
