import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { format } from "date-fns";

export function ActiveTimersCard() {
  const { activeTimeEntry, pausedTimeEntries, isTimerPaused, getElapsedTime, tasks, projects, clients, pauseTimeTracking, resumeTimeTracking } = useAppContext();
  const [displayTime, setDisplayTime] = useState("00:00:00");

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
                    {tasks.find(t => t.id === activeTimeEntry.taskId)?.title || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clients.find(c => c.id === activeTimeEntry.clientId)?.name || 'No Client'} • {projects.find(p => p.id === tasks.find(t => t.id === activeTimeEntry.taskId)?.projectId)?.name || 'No Project'}
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
                    {tasks.find(t => t.id === activeTimeEntry.taskId)?.title || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clients.find(c => c.id === activeTimeEntry.clientId)?.name || 'No Client'} • {projects.find(p => p.id === tasks.find(t => t.id === activeTimeEntry.taskId)?.projectId)?.name || 'No Project'}
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
        {pausedTimeEntries && pausedTimeEntries.length > 0 && activeTimeEntry?.id !== pausedTimeEntries[0]?.id && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paused</p>
            {pausedTimeEntries.map((entry) => (
              <div key={entry.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{entry.duration} mins</p>
                    <p className="text-xs text-muted-foreground">Paused</p>
                  </div>
                  <Pause className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
