import { useMemo, useState } from "react";
import { Project } from "@/types";
import { format, startOfWeek, endOfWeek, addWeeks, isWithinInterval, isValid, isBefore, differenceInDays, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Layers, LayoutGrid, List, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProjectsTimelineProps {
  projects: Project[];
  getClientName: (clientId: string) => string;
  onCardClick: (projectId: string) => void;
  onToggleFavorite?: (projectId: string) => void;
  isFavorite?: (projectId: string) => boolean;
}

interface OwnerCapacity {
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  projects: Project[];
  weeklyCount: number[];
  maxConcurrent: number;
}

const STATUS_COLORS: Record<string, string> = {
  "planning": "bg-blue-500",
  "in-progress": "bg-green-500",
  "on-hold": "bg-yellow-500",
  "completed": "bg-gray-400",
  "todo": "bg-slate-500",
};

export function ProjectsTimeline({ projects, getClientName, onCardClick, onToggleFavorite, isFavorite }: ProjectsTimelineProps) {
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

  const getOwnerName = (ownerId: string | null | undefined) => {
    if (!ownerId) return "Unassigned";
    const user = users.find(u => u.auth_user_id === ownerId);
    return user?.name || "Unknown";
  };

  const getOwnerAvatar = (ownerId: string | null | undefined) => {
    if (!ownerId) return undefined;
    const user = users.find(u => u.auth_user_id === ownerId);
    return user?.avatar || undefined;
  };

  // Check if project overlaps with a given week
  const projectOverlapsWeek = (project: Project, weekStart: Date, weekEnd: Date): boolean => {
    const startDate = parseDate(project.startDate);
    const endDate = parseDate(project.dueDate);
    
    if (!startDate && !endDate) return false;
    
    if (startDate && !endDate) {
      return !isAfter(weekStart, startDate) || isWithinInterval(startDate, { start: weekStart, end: weekEnd }) || isBefore(startDate, weekStart);
    }
    
    if (!startDate && endDate) {
      return !isBefore(endDate, weekStart);
    }
    
    if (startDate && endDate) {
      return !(isAfter(weekStart, endDate) || isBefore(weekEnd, startDate));
    }
    
    return false;
  };

  // Generate week dates
  const weekDates = useMemo(() => {
    const weeks: { start: Date; end: Date; label: string; isCurrentWeek: boolean }[] = [];
    const today = new Date();
    let currentWeek = viewRangeStart;

    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      weeks.push({
        start: currentWeek,
        end: weekEnd,
        label: format(currentWeek, "MMM d"),
        isCurrentWeek: isWithinInterval(today, { start: currentWeek, end: weekEnd }),
      });
      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [viewRangeStart]);

  // Group projects by owner and calculate capacity
  const ownerCapacities = useMemo(() => {
    const ownerMap = new Map<string, OwnerCapacity>();
    
    // Get projects with dates
    const projectsWithDates = projects.filter(p => parseDate(p.startDate) || parseDate(p.dueDate));
    
    // Group by owner
    projectsWithDates.forEach(project => {
      const ownerId = project.ownerId || "unassigned";
      
      if (!ownerMap.has(ownerId)) {
        ownerMap.set(ownerId, {
          ownerId,
          ownerName: getOwnerName(project.ownerId),
          ownerAvatar: getOwnerAvatar(project.ownerId),
          projects: [],
          weeklyCount: new Array(WEEKS_TO_SHOW).fill(0),
          maxConcurrent: 0,
        });
      }
      
      const capacity = ownerMap.get(ownerId)!;
      capacity.projects.push(project);
      
      // Count projects per week for this owner
      weekDates.forEach((week, weekIndex) => {
        if (projectOverlapsWeek(project, week.start, week.end)) {
          capacity.weeklyCount[weekIndex]++;
        }
      });
    });

    // Calculate max concurrent for each owner
    ownerMap.forEach(capacity => {
      capacity.maxConcurrent = Math.max(...capacity.weeklyCount, 0);
    });

    // Sort by owner name, with "Unassigned" last
    return Array.from(ownerMap.values()).sort((a, b) => {
      if (a.ownerId === "unassigned") return 1;
      if (b.ownerId === "unassigned") return -1;
      return a.ownerName.localeCompare(b.ownerName);
    });
  }, [projects, weekDates, users]);

  // Projects without dates
  const projectsNoDates = projects.filter(p => !parseDate(p.startDate) && !parseDate(p.dueDate));

  // Overall capacity metrics
  const totalMaxConcurrent = Math.max(...ownerCapacities.map(o => o.maxConcurrent), 0);
  const totalProjectsWithDates = projects.filter(p => parseDate(p.startDate) || parseDate(p.dueDate)).length;

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

  // Render project bar
  const renderProjectBar = (project: Project) => {
    const startDate = parseDate(project.startDate);
    const endDate = parseDate(project.dueDate);
    
    const timelineStart = viewRangeStart;
    const timelineEnd = addWeeks(viewRangeStart, WEEKS_TO_SHOW);
    
    const visibleStart = startDate && isBefore(startDate, timelineStart) ? timelineStart : startDate;
    const visibleEnd = endDate && isAfter(endDate, timelineEnd) ? timelineEnd : endDate;
    
    if (!visibleStart && !visibleEnd) return null;
    
    const effectiveStart = visibleStart || timelineStart;
    const effectiveEnd = visibleEnd || timelineEnd;
    
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
              className="relative h-7 cursor-pointer"
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
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Project Owners</span>
            </div>
            <p className="text-2xl font-bold mt-1">{ownerCapacities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Highest Load</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalMaxConcurrent} projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scheduled</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalProjectsWithDates}</p>
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
      </div>

      {/* Timeline by Owner */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Capacity by Project Owner
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
                <div className="flex mb-2">
                  <div className="w-48 flex-shrink-0" /> {/* Owner column spacer */}
                  <div className="flex gap-1" style={{ minWidth: `${WEEKS_TO_SHOW * 120}px` }}>
                    {weekDates.map((week, index) => (
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
                </div>

                {/* Owner rows */}
                {ownerCapacities.map((owner) => (
                  <div key={owner.ownerId} className="mb-6">
                    {/* Owner header with capacity indicators */}
                    <div className="flex items-center mb-2">
                      <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={owner.ownerAvatar} />
                          <AvatarFallback className="text-xs">
                            {owner.ownerName.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{owner.ownerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {owner.projects.length} project{owner.projects.length !== 1 ? "s" : ""} • Max {owner.maxConcurrent}
                          </p>
                        </div>
                      </div>
                      
                      {/* Weekly capacity bars */}
                      <div className="flex gap-1" style={{ minWidth: `${WEEKS_TO_SHOW * 120}px` }}>
                        {owner.weeklyCount.map((count, weekIndex) => {
                          const capacityColor = count === 0 
                            ? "bg-muted" 
                            : count === 1 
                              ? "bg-green-200 dark:bg-green-900" 
                              : count === 2 
                                ? "bg-yellow-200 dark:bg-yellow-900" 
                                : "bg-red-200 dark:bg-red-900";
                          
                          return (
                            <TooltipProvider key={weekIndex}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`flex-shrink-0 w-28 h-5 rounded flex items-center justify-center text-[10px] font-medium ${capacityColor}`}
                                  >
                                    {count > 0 && `${count}`}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{count} project(s) for {owner.ownerName}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    </div>

                    {/* Project bars for this owner */}
                    <div className="flex">
                      <div className="w-48 flex-shrink-0" /> {/* Spacer */}
                      <div className="flex-1 space-y-1">
                        {owner.projects.map(project => renderProjectBar(project))}
                      </div>
                    </div>
                  </div>
                ))}

                {ownerCapacities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No projects with dates scheduled
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
                        {owner.projects.length} project{owner.projects.length !== 1 ? "s" : ""} • 
                        Max concurrent: {owner.maxConcurrent}
                      </p>
                    </div>
                  </div>

                  {/* Week breakdown */}
                  <div className="space-y-2">
                    {weekDates.map((week, weekIndex) => {
                      const weekProjects = owner.projects.filter(p => 
                        projectOverlapsWeek(p, week.start, week.end)
                      );
                      
                      if (weekProjects.length === 0) return null;
                      
                      return (
                        <div key={weekIndex} className={week.isCurrentWeek ? "bg-primary/5 p-2 rounded border border-primary/20" : "pl-2"}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${week.isCurrentWeek ? "text-primary" : ""}`}>
                              {format(week.start, "MMM d")} - {format(week.end, "MMM d")}
                            </span>
                            {week.isCurrentWeek && (
                              <Badge variant="default" className="text-xs">Current</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              ({weekProjects.length} project{weekProjects.length !== 1 ? "s" : ""})
                            </span>
                          </div>
                          <ul className="space-y-1 pl-4">
                            {weekProjects.map(project => (
                              <li 
                                key={project.id} 
                                className="text-sm flex items-center gap-2 cursor-pointer hover:text-primary"
                                onClick={() => onCardClick(project.id)}
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[project.status] || "bg-slate-500"}`} />
                                <span>{project.name}</span>
                                <span className="text-muted-foreground text-xs">— {getClientName(project.clientId)}</span>
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
                  No projects with dates scheduled
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
              <span className="text-sm">1 project</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900" />
              <span className="text-sm">2 projects</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
              <span className="text-sm">3+ projects</span>
            </div>
            <div className="border-l pl-4 flex flex-wrap gap-4">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-sm capitalize">{status.replace("-", " ")}</span>
                </div>
              ))}
            </div>
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
                      {getOwnerName(project.ownerId)}
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
