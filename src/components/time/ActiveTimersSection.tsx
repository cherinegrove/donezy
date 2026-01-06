import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, Save, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TimeEntry } from "@/types";
import { format } from "date-fns";

interface TimerItem {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName?: string;
  clientName?: string;
  startTime: Date;
  elapsed: number;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number;
  isActive: boolean;
  isLocalOnly: boolean;
  userId?: string; // Track which user this timer belongs to
}

interface ActiveTimersSectionProps {
  activeTimer: {
    task: any;
    project: any;
    client: any;
    user: any;
    timeEntry: TimeEntry;
    elapsedTime: string;
  } | null;
  localTimers: TimerItem[];
  isTimerPaused: boolean;
  onPauseTimer: () => void;
  onStopTimer: () => void;
  onEditTimer: (timeEntry: TimeEntry) => void;
}

export function ActiveTimersSection({
  activeTimer,
  localTimers,
  isTimerPaused,
  onPauseTimer,
  onStopTimer,
  onEditTimer,
}: ActiveTimersSectionProps) {
  const { 
    stopTimeTracking, 
    startTimeTracking, 
    pauseTimeTracking, 
    activeTimeEntry, 
    addTimeEntry, 
    currentUser,
    tasks,
    projects 
  } = useAppContext();
  
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedLocalTimer, setSelectedLocalTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleLocalTimerPause = async (timer: TimerItem) => {
    if (timer.isPaused) {
      // Resume: start as new backend timer
      console.log('▶️ Resuming local timer:', timer.id.slice(0, 8));
      
      // Stop current backend timer if running
      if (activeTimeEntry && !isTimerPaused) {
        await stopTimeTracking('Auto-paused when resuming another timer');
      }
      
      // Start this timer
      await startTimeTracking(timer.taskId);
      
      // Remove from localStorage
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        const parsed = JSON.parse(savedTimers);
        const filtered = parsed.filter((t: any) => t.id !== timer.id);
        localStorage.setItem('activeTimers', JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('timersUpdated'));
      }
    } else {
      // Pause: update in localStorage
      console.log('⏸️ Pausing local timer:', timer.id.slice(0, 8));
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        const parsed = JSON.parse(savedTimers);
        const updated = parsed.map((t: any) => 
          t.id === timer.id 
            ? { ...t, isPaused: true, pausedAt: new Date().toISOString(), isActive: false }
            : t
        );
        localStorage.setItem('activeTimers', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('timersUpdated'));
      }
    }
  };

  const handleLocalTimerStop = (timer: TimerItem) => {
    setSelectedLocalTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmLocalTimerStop = async () => {
    if (!selectedLocalTimer || !currentUser) return;

    try {
      const endTime = new Date();
      const startTime = new Date(selectedLocalTimer.startTime);
      
      // Calculate actual elapsed time at this moment (not from stale state)
      let actualElapsedMs: number;
      
      if (selectedLocalTimer.isPaused) {
        // Timer is paused - use the elapsed time at pause
        actualElapsedMs = selectedLocalTimer.elapsed;
      } else if (selectedLocalTimer.isActive) {
        // Timer is actively running - calculate from start time minus paused time
        actualElapsedMs = endTime.getTime() - startTime.getTime() - (selectedLocalTimer.totalPausedTime || 0);
      } else {
        // Timer is stopped/inactive - use the stored elapsed
        actualElapsedMs = selectedLocalTimer.elapsed;
      }
      
      const durationMinutes = Math.floor(actualElapsedMs / (1000 * 60));
      
      const task = tasks.find(t => t.id === selectedLocalTimer.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      
      console.log('💾 Saving local timer as completed time entry:', {
        taskTitle: selectedLocalTimer.taskTitle,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        calculatedElapsedMs: actualElapsedMs,
        storedElapsedMs: selectedLocalTimer.elapsed,
        durationMinutes,
        isPaused: selectedLocalTimer.isPaused,
        isActive: selectedLocalTimer.isActive,
        totalPausedTime: selectedLocalTimer.totalPausedTime
      });
      
      await addTimeEntry({
        userId: currentUser.id,
        taskId: selectedLocalTimer.taskId,
        projectId: project?.id || null,
        clientId: project?.clientId || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationMinutes,
        description: notes || null,
        billable: true,
        status: 'pending',
      });

      // Remove from localStorage
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        const parsed = JSON.parse(savedTimers);
        const filtered = parsed.filter((t: any) => t.id !== selectedLocalTimer.id);
        localStorage.setItem('activeTimers', JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('timersUpdated'));
      }
      
      setStopDialogOpen(false);
      setSelectedLocalTimer(null);
      setNotes("");
    } catch (error) {
      console.error('Error stopping local timer:', error);
    }
  };

  const handleDeleteLocalTimer = (timerId: string) => {
    console.log('🗑️ Deleting local timer:', timerId.slice(0, 8));
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      const parsed = JSON.parse(savedTimers);
      const filtered = parsed.filter((t: any) => t.id !== timerId);
      localStorage.setItem('activeTimers', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('timersUpdated'));
    }
  };

  const handleDeleteBackendTimer = async () => {
    if (activeTimeEntry) {
      console.log('🗑️ Deleting backend timer');
      await stopTimeTracking('Timer deleted');
    }
  };

  // Combine all timers into a unified list matching TimerBox style
  const allTimers: TimerItem[] = [];

  // Add backend timer if exists
  if (activeTimer) {
    allTimers.push({
      id: activeTimer.timeEntry.id,
      taskId: activeTimer.timeEntry.taskId || '',
      taskTitle: activeTimer.task?.title || 'Unknown Task',
      projectName: activeTimer.project?.name,
      clientName: activeTimer.client?.name,
      startTime: new Date(activeTimer.timeEntry.startTime),
      elapsed: 0, // Will use elapsedTime string instead
      isPaused: isTimerPaused,
      pausedAt: undefined,
      totalPausedTime: 0,
      isActive: !isTimerPaused,
      isLocalOnly: false,
    });
  }

  // Add local timers
  localTimers.forEach(timer => {
    // Don't duplicate if it's the same as backend timer
    if (!allTimers.find(t => t.id === timer.id)) {
      allTimers.push(timer);
    }
  });

  if (allTimers.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No active timers</p>
        <p className="text-sm text-muted-foreground">Start a timer from the + menu or from a task</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {allTimers.map((timer) => {
          const isBackendTimer = !timer.isLocalOnly && activeTimer && timer.id === activeTimer.timeEntry.id;
          const now = Date.now();
          const elapsed = timer.isActive && !timer.isPaused && timer.isLocalOnly
            ? now - timer.startTime.getTime() - (timer.totalPausedTime || 0)
            : timer.elapsed;
          
          const displayTime = isBackendTimer ? activeTimer!.elapsedTime : formatTime(elapsed);
          const isLive = isBackendTimer ? !isTimerPaused : (timer.isActive && !timer.isPaused);
          const showPlayButton = isBackendTimer ? isTimerPaused : timer.isPaused;

          return (
            <div 
              key={timer.id} 
              className="flex items-start justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{timer.taskTitle}</h4>
                {timer.projectName && (
                  <p className="text-xs text-muted-foreground">{timer.projectName}</p>
                )}
                {timer.clientName && (
                  <p className="text-xs text-muted-foreground/80">Client: {timer.clientName}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Started: {format(timer.startTime, "HH:mm")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="font-mono text-lg font-bold">
                    {displayTime}
                  </div>
                  <div className="flex gap-1">
                    {isLive && (
                      <Badge variant="default" className="text-xs">
                        Live
                      </Badge>
                    )}
                    {!isLive && (
                      <Badge variant="secondary" className="text-xs">
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isBackendTimer) {
                      onPauseTimer();
                    } else {
                      handleLocalTimerPause(timer);
                    }
                  }}
                  className={cn(
                    "h-8 w-8 p-0",
                    showPlayButton ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"
                  )}
                >
                  {showPlayButton ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isBackendTimer) {
                      onStopTimer();
                    } else {
                      handleLocalTimerStop(timer);
                    }
                  }}
                  className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isBackendTimer) {
                      handleDeleteBackendTimer();
                    } else {
                      handleDeleteLocalTimer(timer.id);
                    }
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stop Local Timer Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedLocalTimer && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Task</p>
                  <p>{selectedLocalTimer.taskTitle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Time Elapsed</p>
                  <p className="text-2xl font-mono font-bold">
                    {formatTime(
                      selectedLocalTimer.isActive && !selectedLocalTimer.isPaused
                        ? Date.now() - selectedLocalTimer.startTime.getTime() - (selectedLocalTimer.totalPausedTime || 0)
                        : selectedLocalTimer.elapsed
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Notes (optional)</p>
                  <Textarea
                    placeholder="Add notes about your work..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLocalTimerStop}>
              <Save className="h-4 w-4 mr-2" />
              Save Time Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}