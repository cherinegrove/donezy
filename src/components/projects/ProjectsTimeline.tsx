import { useMemo, useState } from "react";
import { Project } from "@/types";
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isValid, isBefore, differenceInDays, parseISO, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Layers, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

interface ProjectsTimelineProps {
  projects: Project[];
  getClientName: (clientId: string) => string;
  onCardClick: (projectId: string) => void;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  projects: Project[];
  isCurrentWeek: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "planning": "bg-blue-500",
  "in-progress": "bg-green-500",
  "on-hold": "bg-yellow-500",
  "completed": "bg-gray-400",
  "todo": "bg-slate-500",
};

export function ProjectsTimeline({ projects, getClientName, onCardClick }: ProjectsTimelineProps) {
  const { users } = useAppContext();
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");
  const [viewRangeStart, setViewRangeStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const WEEKS_TO_SHOW = 12;

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

  // Generate timeline weeks
  const timelineWeeks = useMemo(() => {
    const weeks: WeekData[] = [];
    const today = new Date();
    let currentWeek = viewRangeStart;

    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      
      // Find projects that overlap with this week
      const weekProjects = projects.filter(project => {
        const startDate = parseDate(project.startDate);
        const endDate = parseDate(project.dueDate);
        
        if (!startDate && !endDate) return false;
        
        // If only start date, project extends indefinitely
        if (startDate && !endDate) {
          return !isAfter(currentWeek, startDate) || isWithinInterval(startDate, { start: currentWeek, end: weekEnd }) || isBefore(startDate, currentWeek);
        }
        
        // If only end date, project started before
        if (!startDate && endDate) {
          return !isBefore(endDate, currentWeek);
        }
        
        // Both dates - check overlap
        if (startDate && endDate) {
          return !(isAfter(currentWeek, endDate) || isBefore(weekEnd, startDate));
        }
        
        return false;
      });

      weeks.push({
        weekStart: currentWeek,
        weekEnd,
        label: format(currentWeek, "MMM d"),
        projects: weekProjects,
        isCurrentWeek: isWithinInterval(today, { start: currentWeek, end: weekEnd }),
      });

      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [projects, viewRangeStart]);

  // Projects without dates
  const projectsNoDates = projects.filter(p => !parseDate(p.startDate) && !parseDate(p.dueDate));

  // Capacity metrics
  const maxConcurrentProjects = Math.max(...timelineWeeks.map(w => w.projects.length), 0);
  const avgProjectsPerWeek = timelineWeeks.length > 0 
    ? (timelineWeeks.reduce((sum, w) => sum + w.projects.length, 0) / timelineWeeks.length).toFixed(1)
    : 0;

  const getOwnerName = (ownerId: string | null | undefined) => {
    if (!ownerId) return "Unassigned";
    const user = users.find(u => u.auth_user_id === ownerId);
    return user?.name || "Unknown";
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
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Max Concurrent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{maxConcurrentProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Projects/Week</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgProjectsPerWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No Dates Set</span>
            </div>
            <p className="text-2xl font-bold mt-1">{projectsNoDates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Projects</span>
            </div>
            <p className="text-2xl font-bold mt-1">{projects.filter(p => p.status !== "completed").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline & Capacity
            </CardTitle>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "visual" | "text")}>
                <ToggleGroupItem value="visual" aria-label="Visual view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="text" aria-label="Text view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
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
            <ScrollArea className="w-full">
              <div className="pb-4">
                {/* Week headers */}
                <div className="flex gap-1 mb-2" style={{ minWidth: `${WEEKS_TO_SHOW * 120}px` }}>
                  {timelineWeeks.map((week, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 w-28 text-center text-xs font-medium py-1 rounded ${
                        week.isCurrentWeek 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {week.label}
                    </div>
                  ))}
                </div>

                {/* Capacity indicator */}
                <div className="flex gap-1 mb-4" style={{ minWidth: `${WEEKS_TO_SHOW * 120}px` }}>
                  {timelineWeeks.map((week, index) => {
                    const capacityLevel = week.projects.length;
                    const capacityColor = capacityLevel === 0 
                      ? "bg-muted" 
                      : capacityLevel <= 2 
                        ? "bg-green-200 dark:bg-green-900" 
                        : capacityLevel <= 4 
                          ? "bg-yellow-200 dark:bg-yellow-900" 
                          : "bg-red-200 dark:bg-red-900";
                    
                    return (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex-shrink-0 w-28 h-6 rounded flex items-center justify-center text-xs font-medium ${capacityColor}`}
                            >
                              {capacityLevel} project{capacityLevel !== 1 ? "s" : ""}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{week.projects.length} active project(s) this week</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                {/* Project bars */}
                <div className="space-y-2">
                  {projects
                    .filter(p => parseDate(p.startDate) || parseDate(p.dueDate))
                    .map(project => {
                      const startDate = parseDate(project.startDate);
                      const endDate = parseDate(project.dueDate);
                      
                      // Calculate position and width
                      const timelineStart = viewRangeStart;
                      const timelineEnd = addWeeks(viewRangeStart, WEEKS_TO_SHOW);
                      
                      // Determine visible portion
                      const visibleStart = startDate && isBefore(startDate, timelineStart) ? timelineStart : startDate;
                      const visibleEnd = endDate && isAfter(endDate, timelineEnd) ? timelineEnd : endDate;
                      
                      if (!visibleStart && !visibleEnd) return null;
                      
                      const effectiveStart = visibleStart || timelineStart;
                      const effectiveEnd = visibleEnd || timelineEnd;
                      
                      // Check if project is visible in current range
                      if (isAfter(effectiveStart, timelineEnd) || isBefore(effectiveEnd, timelineStart)) {
                        return null;
                      }
                      
                      const totalDays = differenceInDays(timelineEnd, timelineStart);
                      const startOffset = Math.max(0, differenceInDays(effectiveStart, timelineStart));
                      const duration = Math.max(1, differenceInDays(effectiveEnd, effectiveStart));
                      
                      const leftPercent = (startOffset / totalDays) * 100;
                      const widthPercent = Math.min((duration / totalDays) * 100, 100 - leftPercent);
                      
                      const statusColor = STATUS_COLORS[project.status] || "bg-slate-500";
                      
                      return (
                        <TooltipProvider key={project.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="relative h-8 cursor-pointer"
                                style={{ minWidth: `${WEEKS_TO_SHOW * 120}px` }}
                                onClick={() => onCardClick(project.id)}
                              >
                                <div
                                  className={`absolute h-full rounded ${statusColor} opacity-80 hover:opacity-100 transition-opacity flex items-center px-2 overflow-hidden`}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: "60px"
                                  }}
                                >
                                  <span className="text-xs font-medium text-white truncate">
                                    {project.name}
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{project.name}</p>
                                <p className="text-xs">Client: {getClientName(project.clientId)}</p>
                                <p className="text-xs">Owner: {getOwnerName(project.ownerId)}</p>
                                <p className="text-xs">
                                  {startDate ? format(startDate, "MMM d, yyyy") : "No start"} 
                                  {" → "}
                                  {endDate ? format(endDate, "MMM d, yyyy") : "No end"}
                                </p>
                                <Badge className="text-xs">{project.status}</Badge>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            /* Text View */
            <div className="space-y-4">
              {timelineWeeks.map((week, index) => (
                <div key={index} className={week.isCurrentWeek ? "bg-primary/5 p-3 rounded-lg border border-primary/20" : ""}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-semibold ${week.isCurrentWeek ? "text-primary" : ""}`}>
                      {format(week.weekStart, "MMM d")} - {format(week.weekEnd, "MMM d, yyyy")}
                    </h3>
                    {week.isCurrentWeek && (
                      <Badge variant="default" className="text-xs">Current Week</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      ({week.projects.length} project{week.projects.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  {week.projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-4">No active projects</p>
                  ) : (
                    <ul className="space-y-1 pl-4">
                      {week.projects.map(project => (
                        <li 
                          key={project.id} 
                          className="text-sm flex items-center gap-2 cursor-pointer hover:text-primary"
                          onClick={() => onCardClick(project.id)}
                        >
                          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status] || "bg-slate-500"}`} />
                          <span className="font-medium">{project.name}</span>
                          <span className="text-muted-foreground">— {getClientName(project.clientId)}</span>
                          <Badge variant="outline" className="text-[10px]">{project.status}</Badge>
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

      {/* Status Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${color}`} />
                <span className="text-sm capitalize">{status.replace("-", " ")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Projects without dates */}
      {projectsNoDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-5 w-5" />
              Projects Without Dates ({projectsNoDates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsNoDates.map(project => (
                <div
                  key={project.id}
                  className="p-3 rounded border bg-muted/30 border-border cursor-pointer hover:bg-muted/50"
                  onClick={() => onCardClick(project.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status] || "bg-slate-500"}`} />
                    <span className="font-medium text-sm">{project.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {getClientName(project.clientId)}
                    </span>
                    <Badge variant="outline" className="text-xs">{project.status}</Badge>
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
