import { useAppContext } from "@/contexts/AppContext";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ActiveTimersCard() {
  const { activeTimeEntry, pausedTimeEntries, isTimerPaused, getElapsedTime, pauseTimeTracking, resumeTimeTracking, stopTimeTracking } = useAppContext();
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopNotes, setStopNotes] = useState("");

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
                    {activeTimeEntry.taskTitle || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTimeEntry.clientName || 'No Client'} • {activeTimeEntry.projectName || 'No Project'}
                  </p>
                  {activeTimeEntry.description && (
                    <p className="text-xs text-muted-foreground italic mt-1">📝 {activeTimeEntry.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => pauseTimeTracking()}
                    className="h-8 w-8 p-0 text-warning hover:text-warning/80"
                    title="Pause timer"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStopDialog(true)}
                    className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                    title="Save timer"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
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
                    {activeTimeEntry.taskTitle || 'Unknown Task'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTimeEntry.clientName || 'No Client'} • {activeTimeEntry.projectName || 'No Project'}
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
                return (
                  <div key={entry.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.taskTitle || 'Unknown Task'}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.clientName || 'No Client'} • {entry.projectName || 'No Project'}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground italic mt-1">📝 {entry.description}</p>
                        )}
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

      {/* Stop Timer Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTimeEntry && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Task</p>
                  <p className="text-sm">{activeTimeEntry.taskTitle || 'Unknown Task'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Start Time</p>
                  <p className="text-sm">{format(new Date(activeTimeEntry.startTime), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <input
                    id="end-time"
                    type="datetime-local"
                    defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes..."
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                    defaultValue={activeTimeEntry.description || ""}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const notesToSave = stopNotes || activeTimeEntry?.description || undefined;
                  await stopTimeTracking(notesToSave);
                  setShowStopDialog(false);
                  setStopNotes("");
                  toast.success("Timer saved");
                } catch (error) {
                  toast.error("Failed to save timer");
                }
              }}
            >
              Save Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
