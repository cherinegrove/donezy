import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { format } from "date-fns";

export function ActiveTimersCard() {
  const { activeTimeEntry, pausedTimeEntries, updateTimeEntry } = useAppContext();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second if a timer is running
  useEffect(() => {
    if (!activeTimeEntry) return;

    const interval = setInterval(() => {
      const startTime = new Date(activeTimeEntry.startTime).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000); // in seconds
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

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
        {/* Active Timer */}
        {activeTimeEntry && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-blue-500 dark:border-blue-600">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Running</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {formatTime(elapsedTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                Started {format(new Date(activeTimeEntry.startTime), "h:mm a")}
              </p>
            </div>
          </div>
        )}

        {/* Paused Timers */}
        {pausedTimeEntries && pausedTimeEntries.length > 0 && (
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
