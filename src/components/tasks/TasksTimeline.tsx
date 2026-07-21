import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Users, AlertTriangle, Calendar, Eye, LayoutGrid, ListIcon } from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { Task, User, TimeEntry } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

interface TasksTimelineProps {
  tasks: Task[];
}

interface OwnerCapacity {
  owner: User | null;
  tasks: Task[];
  weeklyCapacity: Map<string, number>; // week key -> hours (number)
  maxConcurrent: number; // max hours in any week
}

interface TeamCapacityThresholds {
  minimumHours: number;
  goodHours: number;
  maxHours: number;
}

const DEFAULT_THRESHOLDS: TeamCapacityThresholds = {
  minimumHours: 15,
  goodHours: 20,
  maxHours: 30,
};

export function TasksTimeline({ tasks }: TasksTimelineProps) {
  const { users, projects, taskStatuses, currentUser, timeEntries } = useAppContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"visual" | "text">("visual");
  const [teamCapacityThresholds, setTeamCapacityThresholds] = useState<TeamCapacityThresholds>(DEFAULT_THRESHOLDS);
  const weeksToShow = 8; // Fixed 8 weeks as requested

  // Fetch team capacity thresholds from organization settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser?.organizationId) {
        setTeamCapacityThresholds(DEFAULT_THRESHOLDS);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("settings")
          .eq("id", currentUser.organizationId)
          .maybeSingle();

        if (error) {
          console.error("Error loading organization settings:", error);
          setTeamCapacityThresholds(DEFAULT_THRESHOLDS);
          return;
        }

        const settings = (data?.settings as any) || {};
        if (settings.teamCapacity) {
          setTeamCapacityThresholds(settings.teamCapacity);
        } else {
          setTeamCapacityThresholds(DEFAULT_THRESHOLDS);
        }
      } catch (err) {
        console.error("Error fetching team capacity settings:", err);
        setTeamCapacityThresholds(DEFAULT_THRESHOLDS);
      }
    };

    loadSettings();
  }, [currentUser?.organizationId]);

  // Generate week ranges
  const weekRanges = useMemo(() => {
    const ranges = [];
    const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = addWeeks(baseDate, i + weekOffset);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      ranges.push({
        start: weekStart,
        end: weekEnd,
        label: format(weekStart, "MMM d"),
        isCurrentWeek: i === 0 && weekOffset === 0,
      });
    }
    return ranges;
  }, [weekOffset]);

  // Group tasks by owner and calculate capacity
  const ownerCapacities = useMemo(() => {
    const ownerMap = new Map<string, OwnerCapacity>();

    // Group tasks by owner
    tasks.forEach(task => {
      const ownerId = task.assigneeId || "unassigned";

      if (!ownerMap.has(ownerId)) {
        const owner = users.find(u => u.id === ownerId || u.auth_user_id === ownerId) || null;
        ownerMap.set(ownerId, {
          owner,
          tasks: [],
          weeklyCapacity: new Map(),
          maxConcurrent: 0,
        });
      }

      ownerMap.get(ownerId)!.tasks.push(task);
    });

    // Calculate weekly hours for each owner from time entries
    ownerMap.forEach((capacity, ownerId) => {
      weekRanges.forEach(week => {
        const weekKey = format(week.start, "yyyy-MM-dd");
        let totalHours = 0;

        // Get time entries for this owner in this week
        if (ownerId !== "unassigned") {
          timeEntries.forEach(entry => {
            // Check if entry belongs to this owner
            if (entry.userId === ownerId || entry.authUserId === ownerId) {
              const entryDate = parseISO(entry.startTime);

              // Check if entry date falls within this week
              if (isWithinInterval(entryDate, { start: week.start, end: week.end })) {
                totalHours += entry.duration / 60; // Convert minutes to hours (all hours count)
              }
            }
          });
        }

        capacity.weeklyCapacity.set(weekKey, totalHours);
        if (totalHours > capacity.maxConcurrent) {
          capacity.maxConcurrent = totalHours;
        }
      });
    });

    // Sort by max hours (highest load first), with unassigned at the end
    return Array.from(ownerMap.values()).sort((a, b) => {
      if (!a.owner) return 1;
      if (!b.owner) return -1;
      return b.maxConcurrent - a.maxConcurrent;
    });
  }, [tasks, users, weekRanges, timeEntries]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalOwners = ownerCapacities.filter(c => c.owner).length;
    const highestLoad = Math.max(...ownerCapacities.map(c => c.maxConcurrent), 0);
    const overloadedOwners = ownerCapacities.filter(
      c => c.maxConcurrent > teamCapacityThresholds.maxHours
    ).length;

    return {
      totalOwners,
      highestLoad: Math.round(highestLoad * 10) / 10, // Round to 1 decimal
      overloadedOwners,
    };
  }, [ownerCapacities, teamCapacityThresholds]);

  const getCapacityColor = (hours: number) => {
    if (hours === 0) return "bg-muted";
    if (hours <= teamCapacityThresholds.minimumHours) return "bg-green-500/80";
    if (hours <= teamCapacityThresholds.goodHours) return "bg-yellow-500/80";
    if (hours <= teamCapacityThresholds.maxHours) return "bg-orange-500/80";
    return "bg-red-500/80";
  };

  const getStatusColor = (status: string) => {
    const statusDef = taskStatuses.find(s => s.label.toLowerCase() === status.toLowerCase() || s.value === status);
    return statusDef?.color || "#6b7280";
  };

  const getOwnerInitials = (owner: User | null) => {
    if (!owner) return "?";
    return owner.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Task Owners</p>
                <p className="text-2xl font-bold">{summaryStats.totalOwners}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Highest Weekly Hours</p>
                <p className="text-2xl font-bold">{summaryStats.highestLoad}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overloaded Owners (&gt;{teamCapacityThresholds.maxHours}h/week)</p>
                <p className="text-2xl font-bold">{summaryStats.overloadedOwners}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Task Capacity by Owner</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "visual" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("visual")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "text" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("text")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(prev => prev - 4)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="px-3"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(prev => prev + 4)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week headers */}
          <div className="flex gap-1 mb-4 pl-48">
            {weekRanges.map((week, idx) => (
              <div
                key={idx}
                className={`flex-1 text-center text-xs font-medium px-1 py-1 rounded ${
                  week.isCurrentWeek ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                {week.label}
              </div>
            ))}
          </div>

          {/* Owner rows */}
          <div className="space-y-3">
            {ownerCapacities.map((capacity, idx) => (
              <div key={capacity.owner?.id || `unassigned-${idx}`} className="flex items-start gap-4">
                {/* Owner info */}
                <div className="w-44 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={capacity.owner?.avatar} />
                      <AvatarFallback className="text-xs">
                        {getOwnerInitials(capacity.owner)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {capacity.owner?.name || "Unassigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {capacity.tasks.length} tasks • Max {Math.round(capacity.maxConcurrent * 10) / 10}h/week
                      </p>
                    </div>
                  </div>
                </div>

                {/* Capacity visualization */}
                {viewMode === "visual" ? (
                  <div className="flex gap-1 flex-1">
                    {weekRanges.map((week, weekIdx) => {
                      const weekKey = format(week.start, "yyyy-MM-dd");
                      const hours = capacity.weeklyCapacity.get(weekKey) || 0;
                      const hoursDisplay = Math.round(hours * 10) / 10;

                      return (
                        <div
                          key={weekIdx}
                          className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${getCapacityColor(hours)} ${
                            hours > 0 ? "text-white" : "text-muted-foreground"
                          }`}
                          title={`${hoursDisplay}h tracked this week`}
                        >
                          {hoursDisplay > 0 ? `${hoursDisplay}h` : ""}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 space-y-1">
                    {capacity.tasks.slice(0, 5).map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        />
                        <span className={`truncate flex-1 ${task.priority === "urgent" ? "text-red-600 font-medium" : ""}`}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {getProjectName(task.projectId)}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            Due {format(parseISO(task.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    ))}
                    {capacity.tasks.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-2">
                        +{capacity.tasks.length - 5} more tasks
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/80" />
              <span className="text-xs text-muted-foreground">0-{teamCapacityThresholds.minimumHours}h (Green)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/80" />
              <span className="text-xs text-muted-foreground">{teamCapacityThresholds.minimumHours}-{teamCapacityThresholds.goodHours}h (Yellow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500/80" />
              <span className="text-xs text-muted-foreground">{teamCapacityThresholds.goodHours}-{teamCapacityThresholds.maxHours}h (Orange)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500/80" />
              <span className="text-xs text-muted-foreground">&gt;{teamCapacityThresholds.maxHours}h (Red)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
