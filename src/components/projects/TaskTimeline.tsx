import { useMemo, useRef, useState } from "react";
import { Task } from "@/types";
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isValid, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";
import { AlertCircle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Download, LayoutGrid, List, Mail, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";

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

interface OwnerCapacity {
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  tasks: Task[];
  weeklyCount: number[];
  maxConcurrent: number;
}

const STATUS_COLORS: Record<string, string> = {
  "done": "bg-green-500",
  "completed": "bg-green-500",
  "in-progress": "bg-blue-500",
  "awaiting-feedback": "bg-yellow-500",
  "backlog": "bg-slate-500",
};

export function TaskTimeline({ tasks, projectId }: TaskTimelineProps) {
  const { users, projects, taskStatuses } = useAppContext();
  
  const getStatusLabel = (status: string) => {
    return taskStatuses.find(s => s.value === status)?.label || status;
  };
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");
  const [timelineMode, setTimelineMode] = useState<"weekly" | "owner">("weekly");
  const [viewRangeStart, setViewRangeStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const project = projects.find(p => p.id === projectId);
  const WEEKS_TO_SHOW = 6;

  // Parse date helper
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    try {
      const date = new Date(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const getAssigneeName = (assigneeId: string | null | undefined) => {
    if (!assigneeId) return "Unassigned";
    const user = users.find(u => u.id === assigneeId || u.auth_user_id === assigneeId);
    return user?.name || "Unknown";
  };

  const getAssigneeAvatar = (assigneeId: string | null | undefined) => {
    if (!assigneeId) return undefined;
    const user = users.find(u => u.id === assigneeId || u.auth_user_id === assigneeId);
    return user?.avatar || undefined;
  };

  // Check if task is due in a given week
  const taskInWeek = (task: Task, weekStart: Date, weekEnd: Date): boolean => {
    const dueDate = parseDate(task.dueDate);
    if (!dueDate) return false;
    return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
  };

  // Generate week dates for owner view
  const weekDates = useMemo(() => {
    const weeks: { start: Date; end: Date; label: string; isCurrentWeek: boolean; isPast: boolean }[] = [];
    const today = new Date();
    let currentWeek = viewRangeStart;

    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      weeks.push({
        start: currentWeek,
        end: weekEnd,
        label: format(currentWeek, "MMM d"),
        isCurrentWeek: isWithinInterval(today, { start: currentWeek, end: weekEnd }),
        isPast: isBefore(weekEnd, today),
      });
      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [viewRangeStart]);

  // Generate 12-week timeline starting from next week (for export)
  const twelveWeekData = useMemo(() => {
    const today = new Date();
    const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
    
    const tasksWithDueDates = tasks.filter(task => parseDate(task.dueDate));

    const weeks: WeekData[] = [];
    let currentWeek = nextWeekStart;
    
    for (let i = 0; i < 12; i++) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekTasks = tasksWithDueDates.filter(task => taskInWeek(task, currentWeek, weekEnd));

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

  // Timeline data for weekly view
  const timelineData = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    const tasksWithDueDates = tasks.filter(task => parseDate(task.dueDate));

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
      const weekTasks = tasksWithDueDates.filter(task => taskInWeek(task, currentWeek, weekEnd));

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

  // Group tasks by owner and calculate capacity
  const ownerCapacities = useMemo(() => {
    const ownerMap = new Map<string, OwnerCapacity>();
    
    const tasksWithDueDates = tasks.filter(task => parseDate(task.dueDate));
    
    tasksWithDueDates.forEach(task => {
      const ownerId = task.assigneeId || "unassigned";
      
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, {
          ownerId,
          ownerName: getAssigneeName(task.assigneeId),
          ownerAvatar: getAssigneeAvatar(task.assigneeId),
          tasks: [],
          weeklyCount: new Array(WEEKS_TO_SHOW).fill(0),
          maxConcurrent: 0,
        });
      }
      
      const capacity = ownerMap.get(ownerId)!;
      capacity.tasks.push(task);
      
      weekDates.forEach((week, weekIndex) => {
        if (taskInWeek(task, week.start, week.end)) {
          capacity.weeklyCount[weekIndex]++;
        }
      });
    });

    ownerMap.forEach(capacity => {
      capacity.maxConcurrent = Math.max(...capacity.weeklyCount, 0);
    });

    return Array.from(ownerMap.values()).sort((a, b) => {
      if (a.ownerId === "unassigned") return 1;
      if (b.ownerId === "unassigned") return -1;
      return a.ownerName.localeCompare(b.ownerName);
    });
  }, [tasks, weekDates, users]);

  const tasksNoDueDate = tasks.filter(task => !parseDate(task.dueDate));

  const totalTasksScheduled = timelineData.reduce((sum, week) => sum + week.tasks.length, 0);
  const avgTasksPerWeek = timelineData.length > 0 
    ? (totalTasksScheduled / timelineData.filter(w => !w.isPast).length).toFixed(1) 
    : 0;

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

  const generateEmailSummary = () => {
    const lines: string[] = [];
    
    lines.push(`Timeline Summary: ${project?.name || "Project"}`);
    lines.push(`Generated: ${format(new Date(), "MMMM d, yyyy")}`);
    lines.push("");
    lines.push("=".repeat(50));
    lines.push("");

    // Use twelveWeekData for a comprehensive 12-week outlook
    twelveWeekData.forEach(week => {
      if (week.tasks.length > 0) {
        lines.push(`📅 ${week.label}`);
        lines.push("-".repeat(30));
        
        week.tasks.forEach(task => {
          const ownerName = getAssigneeName(task.assigneeId);
          const statusLabel = getStatusLabel(task.status);
          const urgentMarker = task.priority === "urgent" ? "🔴 " : "";
          
          lines.push(`  ${urgentMarker}• ${task.title}`);
          lines.push(`    Owner: ${ownerName} | Status: ${statusLabel}`);
          if (task.dueDate) {
            lines.push(`    Due: ${format(new Date(task.dueDate), "MMM d, yyyy")}`);
          }
        });
        
        lines.push("");
      }
    });

    // Add unscheduled tasks section
    if (tasksNoDueDate.length > 0) {
      lines.push("📋 Tasks Without Due Date");
      lines.push("-".repeat(30));
      tasksNoDueDate.forEach(task => {
        const ownerName = getAssigneeName(task.assigneeId);
        const statusLabel = getStatusLabel(task.status);
        lines.push(`  • ${task.title}`);
        lines.push(`    Owner: ${ownerName} | Status: ${statusLabel}`);
      });
      lines.push("");
    }

    // Summary stats
    lines.push("=".repeat(50));
    lines.push("Summary:");
    lines.push(`  • Total Scheduled Tasks: ${totalTasksScheduled}`);
    lines.push(`  • Average Tasks/Week: ${avgTasksPerWeek}`);
    lines.push(`  • Team Members: ${ownerCapacities.length}`);
    lines.push(`  • Tasks Without Due Date: ${tasksNoDueDate.length}`);

    return lines.join("\n");
  };

  const handleCopyEmailSummary = async () => {
    const summary = generateEmailSummary();
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Timeline summary copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy summary");
    }
  };

  const goToPrevious = () => {
    setViewRangeStart(prev => addWeeks(prev, -WEEKS_TO_SHOW));
  };

  const goToNext = () => {
    setViewRangeStart(prev => addWeeks(prev, WEEKS_TO_SHOW));
  };

  const handleDateRangeChange = (date: Date | undefined) => {
    if (date) {
      setViewRangeStart(startOfWeek(date, { weekStartsOn: 1 }));
    }
  };

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
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Team Members</span>
            </div>
            <p className="text-2xl font-bold mt-1">{ownerCapacities.length}</p>
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
      </div>

      {/* Timeline Tabs */}
      <Tabs value={timelineMode} onValueChange={(v) => setTimelineMode(v as "weekly" | "owner")}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              By Week
            </TabsTrigger>
            <TabsTrigger value="owner" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              By Owner
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "visual" | "text")}>
              <ToggleGroupItem value="visual" aria-label="Visual view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="text" aria-label="Text view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyEmailSummary}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Summary
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportImage}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "..." : "Export"}
            </Button>
          </div>
        </div>

        {/* Weekly View Tab */}
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Task Timeline by Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "visual" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timelineData.map((week, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${
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
                      
                      <div className="space-y-2 min-h-[100px] max-h-[200px] overflow-y-auto">
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
                                  {getStatusLabel(task.status)}
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
              ) : (
                <div className="space-y-4">
                  {timelineData.map((week, index) => (
                    <div key={index} className={`${week.isPast ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-semibold ${week.isCurrentWeek ? "text-primary" : ""}`}>
                          {week.label}
                        </h3>
                        {week.isCurrentWeek && (
                          <Badge variant="default" className="text-xs">Current Week</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          ({week.tasks.length} task{week.tasks.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      {week.tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No tasks scheduled</p>
                      ) : (
                        <ul className="space-y-1 pl-4">
                          {week.tasks.map(task => (
                            <li key={task.id} className="text-sm flex items-center gap-2">
                              <span className={task.priority === "urgent" ? "text-red-600 font-medium" : ""}>
                                • {task.title}
                              </span>
                              <span className="text-muted-foreground">
                                — {getAssigneeName(task.assigneeId)}
                              </span>
                              <Badge className={`text-[10px] ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Owner View Tab */}
        <TabsContent value="owner">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Capacity by Task Owner
              </CardTitle>
              
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {format(viewRangeStart, "MMM d, yyyy")} - {format(addWeeks(viewRangeStart, WEEKS_TO_SHOW - 1), "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={viewRangeStart}
                      onSelect={handleDateRangeChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewRangeStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                >
                  Today
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {viewMode === "visual" ? (
                <div className="space-y-4">
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-2">
                    <div className="col-span-1" />
                    {weekDates.map((week, index) => (
                      <div
                        key={index}
                        className={`text-center text-xs font-medium py-1 rounded ${
                          week.isCurrentWeek 
                            ? "bg-primary text-primary-foreground" 
                            : week.isPast
                              ? "bg-muted/50 text-muted-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {week.label}
                      </div>
                    ))}
                  </div>

                  {/* Owner rows */}
                  {ownerCapacities.map((owner) => (
                    <div key={owner.ownerId} className="border rounded-lg p-3">
                      {/* Owner header with capacity indicators */}
                      <div className="grid grid-cols-7 gap-2 items-center mb-2">
                        <div className="col-span-1 flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={owner.ownerAvatar} />
                            <AvatarFallback className="text-xs">
                              {owner.ownerName.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 hidden sm:block">
                            <p className="text-sm font-medium truncate">{owner.ownerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {owner.tasks.length} task{owner.tasks.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        
                        {/* Weekly capacity bars */}
                        {owner.weeklyCount.map((count, weekIndex) => {
                          const capacityColor = count === 0 
                            ? "bg-muted" 
                            : count <= 2 
                              ? "bg-green-200 dark:bg-green-900" 
                              : count <= 4 
                                ? "bg-yellow-200 dark:bg-yellow-900" 
                                : "bg-red-200 dark:bg-red-900";
                          
                          return (
                            <TooltipProvider key={weekIndex}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-8 rounded flex items-center justify-center text-[10px] font-medium ${capacityColor} ${weekDates[weekIndex]?.isPast ? "opacity-50" : ""}`}
                                  >
                                    {count > 0 && count}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{count} task(s) due for {owner.ownerName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>

                      {/* Task list for this owner */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {owner.tasks.slice(0, 6).map(task => (
                          <TooltipProvider key={task.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] max-w-[120px] truncate cursor-default ${
                                    task.priority === "urgent" ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""
                                  }`}
                                >
                                  {task.priority === "urgent" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />}
                                  {task.title}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{task.title}</p>
                                  <p className="text-xs">Due: {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No date"}</p>
                                  <p className="text-xs">Status: {getStatusLabel(task.status)}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {owner.tasks.length > 6 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{owner.tasks.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {ownerCapacities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks with due dates scheduled
                    </div>
                  )}
                </div>
              ) : (
                /* Text View */
                <div className="space-y-6">
                  {ownerCapacities.map((owner) => (
                    <div key={owner.ownerId} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={owner.ownerAvatar} />
                          <AvatarFallback>
                            {owner.ownerName.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{owner.ownerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {owner.tasks.length} task{owner.tasks.length !== 1 ? "s" : ""} • 
                            Max concurrent: {owner.maxConcurrent}
                          </p>
                        </div>
                      </div>

                      {/* Week breakdown */}
                      <div className="space-y-2">
                        {weekDates.map((week, weekIndex) => {
                          const weekTasks = owner.tasks.filter(t => taskInWeek(t, week.start, week.end));
                          
                          if (weekTasks.length === 0) return null;
                          
                          return (
                            <div key={weekIndex} className={`${week.isCurrentWeek ? "bg-primary/5 p-2 rounded border border-primary/20" : "pl-2"} ${week.isPast ? "opacity-50" : ""}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-medium ${week.isCurrentWeek ? "text-primary" : ""}`}>
                                  {format(week.start, "MMM d")} - {format(week.end, "MMM d")}
                                </span>
                                {week.isCurrentWeek && (
                                  <Badge variant="default" className="text-xs">Current</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ({weekTasks.length} task{weekTasks.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                              <ul className="space-y-1 pl-4">
                                {weekTasks.map(task => (
                                  <li key={task.id} className="text-sm flex items-center gap-2">
                                    {task.priority === "urgent" && <span className="w-2 h-2 rounded-full bg-red-500" />}
                                    <span className={task.priority === "urgent" ? "text-red-600" : ""}>{task.title}</span>
                                    <Badge className={`text-[10px] ${getStatusColor(task.status)}`}>{getStatusLabel(task.status)}</Badge>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {ownerCapacities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks with due dates scheduled
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity Legend */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
                  <span className="text-sm">1-2 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900" />
                  <span className="text-sm">3-4 tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
                  <span className="text-sm">5+ tasks</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden export container */}
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
                
                <div className="space-y-2">
                  {week.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tasks
                    </div>
                  ) : (
                    week.tasks.map(task => (
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
                          <span className="font-medium text-xs text-gray-900">{task.title}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">
                            {getAssigneeName(task.assigneeId)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                    ))
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
            <div className="space-y-2">
              {tasksNoDueDate.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3 rounded border cursor-pointer hover:bg-accent/50 transition-colors ${
                    task.priority === "urgent"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getPriorityIndicator(task.priority)}
                      <span className={`font-medium text-sm truncate ${task.priority === "urgent" ? "text-red-600" : ""}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {getAssigneeName(task.assigneeId)}
                      </span>
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Task Dialog */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}
    </div>
  );
}
