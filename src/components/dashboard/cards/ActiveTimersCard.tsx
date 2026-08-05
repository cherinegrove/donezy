import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { format } from "date-fns";

export function ActiveTimersCard() {
  const { activeTimeEntry, pausedTimeEntries, isTimerPaused, getElapsedTime, tasks, projects, clients, pauseTimeTracking, resumeTimeTracking } = useAppContext();
  const [displayTime, setDisplayTime] = useState("00:00:00");

  // Pre-compute lookup maps to avoid O(n²) lookups
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  // Pre-compute current task info
  const currentTask = useMemo(() =>
    activeTimeEntry ? taskMap.get(activeTimeEntry.taskId) : null,
    [activeTimeEntry?.taskId, taskMap]
  );
  const currentProject = useMemo(() =>
    currentTask ? projectMap.get(currentTask.projectId) : null,
    [currentTask?.projectId, projectMap]
  );
  const currentClient = useMemo(() =>
    activeTimeEntry ? clientMap.get(activeTimeEntry.clientId) : null,
    [activeTimeEntry?.clientId, clientMap]
  );

  // Update elapsed time every second if a timer is running (not paused)
  useEffect(() => {
    if (!activeTimeEntry) return;

    // Update immediately and then every second
    const updateDisplay = () => {
      const elapsed = getElapsedTime(activeTimeEntry, true);
      setDisplayTime(elapsed);
    };

    updateDisplay();

    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [activeTimeEntry, isTimerPaused, getElapsedTime]);

  if (!activeTimeEntry && (!pausedTimeEntries || pausedTimeEntries.length === 0)) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            Active Timers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            No active or paused timers
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          Active Timers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active/Running Timer */}
        {activeTimeEntry && !isTimerPaused && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-blue-500 dark:border-blue-600">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Running</p>
                  <p className="text-sm font-semibold truncate">
                    {currentTask?.title || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentClient?.name || 'No Client'} • {currentProject?.name || 'No Project'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pauseTimeTracking()}
                  className="h-8 w-8 p-0 text-warning hover:text-warning/80"
                  title="Pause timer"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {displayTime}
              </p>
              {activeTimeEntry.description && (
                <p className="text-xs text-muted-foreground italic">
                  "{activeTimeEntry.description}"
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Started {format(new Date(activeTimeEntry.startTime), "h:mm a")}
              </p>
            </div>
          </div>
        )}

        {/* Currently Active But Paused Timer */}
        {activeTimeEntry && isTimerPaused && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-yellow-500 dark:border-yellow-600">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Paused</p>
                  <p className="text-sm font-semibold truncate">
                    {currentTask?.title || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentClient?.name || 'No Client'} • {currentProject?.name || 'No Project'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resumeTimeTracking()}
                  className="h-8 w-8 p-0 text-success hover:text-success/80"
                  title="Resume timer"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                {displayTime}
              </p>
              {activeTimeEntry.description && (
                <p className="text-xs text-muted-foreground italic">
                  "{activeTimeEntry.description}"
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Started {format(new Date(activeTimeEntry.startTime), "h:mm a")}
              </p>
            </div>
          </div>
        )}

        {/* Other Paused Timers */}
        {pausedTimeEntries && pausedTimeEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paused</p>
            {pausedTimeEntries
              .filter(entry => entry.id !== activeTimeEntry?.id) // Exclude active timer
              .map((entry) => {
                const task = tasks.find(t => t.id === entry.taskId);
                const project = task ? projects.find(p => p.id === task.projectId) : null;
                const client = project ? clients.find(c => c.id === project.clientId) : null;

                return (
                  <div key={entry.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task?.title || 'Unknown Task'}</p>
                        <p className="text-xs text-muted-foreground">
                          {client?.name || 'No Client'} • {project?.name || 'No Project'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Paused</p>
                      </div>
                      <Pause className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-1 ml-2 flex-shrink-0" />
                    </div>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mt-2">
                      {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
