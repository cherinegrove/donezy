import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Play, Pause, Square, Timer, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TimerItem {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName?: string;
  startTime: Date;
  elapsed: number;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number;
  isActive: boolean;
  isLocalOnly: boolean; // New flag to indicate if this is a local-only timer
}

interface TimerBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimerBox({ isOpen, onClose }: TimerBoxProps) {
  const { activeTimeEntry, tasks, projects, stopTimeTracking, startTimeTracking } = useAppContext();
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");
  const [newlyCreatedTimerId, setNewlyCreatedTimerId] = useState<string | null>(null);

  // Load timers from localStorage on mount and clean duplicates
  useEffect(() => {
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      const parsedTimers = JSON.parse(savedTimers).map((timer: any) => ({
        ...timer,
        startTime: new Date(timer.startTime),
        pausedAt: timer.pausedAt ? new Date(timer.pausedAt) : undefined,
        isLocalOnly: timer.isLocalOnly || false
      }));
      
      // Remove duplicates by ID and keep the latest one
      const uniqueTimers = parsedTimers.reduce((acc: TimerItem[], timer: TimerItem) => {
        const existingIndex = acc.findIndex(t => t.id === timer.id);
        if (existingIndex === -1) {
          acc.push(timer);
        } else {
          // Keep the one with the more recent start time
          if (timer.startTime > acc[existingIndex].startTime) {
            acc[existingIndex] = timer;
          }
        }
        return acc;
      }, []);
      
      setTimers(uniqueTimers);
    }
  }, []);

  // Save timers to localStorage whenever timers change - ensure no duplicates
  useEffect(() => {
    // Remove duplicates before saving
    const uniqueTimers = timers.reduce((acc: TimerItem[], timer: TimerItem) => {
      const existingIndex = acc.findIndex(t => t.id === timer.id);
      if (existingIndex === -1) {
        acc.push(timer);
      } else {
        // Keep the one with the more recent start time
        if (timer.startTime > acc[existingIndex].startTime) {
          acc[existingIndex] = timer;
        }
      }
      return acc;
    }, []);
    
    if (uniqueTimers.length !== timers.length) {
      console.log('Removing duplicate timers, before:', timers.length, 'after:', uniqueTimers.length);
      setTimers(uniqueTimers);
    }
    
    localStorage.setItem('activeTimers', JSON.stringify(uniqueTimers));
  }, [timers]);

  // Handle activeTimeEntry from backend (only for truly new timers started elsewhere)
  useEffect(() => {
    if (activeTimeEntry) {
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      
      // Check if we already have this timer locally
      const existingTimer = timers.find(t => t.id === activeTimeEntry.id || t.taskId === activeTimeEntry.taskId);
      
      if (!existingTimer) {
        // Check if this is a timer we just created
        const isNewTimer = newlyCreatedTimerId === activeTimeEntry.id;
        const now = new Date();
        const dbStartTime = new Date(activeTimeEntry.startTime);
        
        const timerItem: TimerItem = {
          id: activeTimeEntry.id,
          taskId: activeTimeEntry.taskId,
          taskTitle: task?.title || `Task (${activeTimeEntry.taskId.slice(0, 8)}...)`,
          projectName: project?.name,
          startTime: now,
          elapsed: isNewTimer ? 0 : Math.max(0, now.getTime() - dbStartTime.getTime()),
          isPaused: false,
          totalPausedTime: 0,
          isActive: true,
          isLocalOnly: false // This came from the backend
        };
        
        // Clear the newly created timer ID since we've processed it
        if (isNewTimer) {
          setNewlyCreatedTimerId(null);
        }
        
        console.log('TimerBox - creating new timer from backend:', timerItem);
        
        // Mark all other timers as inactive
        setTimers(prev => [
          ...prev.map(t => ({ ...t, isActive: false })),
          timerItem
        ]);
      }
    } else {
      // No active time entry from backend - mark all non-local timers as inactive
      setTimers(prev => prev.map(t => ({ 
        ...t, 
        isActive: t.isLocalOnly ? t.isActive : false 
      })));
    }
  }, [activeTimeEntry, tasks, projects]);

  // Update elapsed time for active timers (both local and backend)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        if (timer.isActive && !timer.isPaused) {
          const now = Date.now();
          const startTime = timer.startTime.getTime();
          timer.elapsed = now - startTime - timer.totalPausedTime;
        }
        return timer;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePauseTimer = (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    console.log('handlePauseTimer - timer:', timer);

    if (timer.isActive && !timer.isPaused) {
      // PAUSE: Just update local state, no backend calls
      console.log('Pausing timer locally only');
      setTimers(prev => prev.map(t => t.id === timerId ? {
        ...t,
        isPaused: true,
        pausedAt: new Date(),
        isActive: false,
        isLocalOnly: true // Now it's local-only
      } : t));
    } else if (timer.isPaused) {
      // RESUME: Just update local state, no backend calls
      console.log('Resuming timer locally only');
      
      // Calculate pause duration and adjust elapsed time
      const pauseDuration = timer.pausedAt ? Date.now() - timer.pausedAt.getTime() : 0;
      
      setTimers(prev => prev.map(t => ({
        ...t,
        isActive: t.id === timerId,
        isPaused: t.id === timerId ? false : t.isPaused,
        pausedAt: t.id === timerId ? undefined : t.pausedAt,
        totalPausedTime: t.id === timerId ? (t.totalPausedTime || 0) + pauseDuration : t.totalPausedTime,
        isLocalOnly: t.id === timerId ? true : t.isLocalOnly // Keep it local-only
      })));
    }
  };

  const handleStopTimer = (timer: TimerItem) => {
    setSelectedTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmStopTimer = async () => {
    if (!selectedTimer) return;

    try {
      // Calculate final duration in minutes
      const finalElapsed = selectedTimer.elapsed + (selectedTimer.pausedAt ? selectedTimer.pausedAt.getTime() - selectedTimer.startTime.getTime() : 0);
      const durationMinutes = Math.floor(finalElapsed / (1000 * 60));

      if (selectedTimer.isLocalOnly) {
        // For local-only timers, create a new time entry in the backend
        console.log('Creating new time entry for local timer');
        await startTimeTracking(selectedTimer.taskId);
        
        // Track that we just created a timer - we'll identify it by checking activeTimeEntry shortly
        const checkForNewTimer = () => {
          if (activeTimeEntry && !newlyCreatedTimerId) {
            setNewlyCreatedTimerId(activeTimeEntry.id);
          }
        };
        setTimeout(checkForNewTimer, 50);
        
        // Wait a moment for the activeTimeEntry to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        await stopTimeTracking(notes);
      } else {
        // For backend timers, just stop the existing one
        await stopTimeTracking(notes);
      }

      // Remove timer from list
      setTimers(prev => prev.filter(t => t.id !== selectedTimer.id));
      
      setStopDialogOpen(false);
      setSelectedTimer(null);
      setNotes("");
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const handleDeleteTimer = (timerId: string) => {
    // Simply remove from local state - no backend interaction needed for deletion
    setTimers(prev => prev.filter(t => t.id !== timerId));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute top-full right-0 mt-2 w-96 z-50 animate-fade-in">
        <Card className="shadow-lg border-2 bg-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Active Timers
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {timers.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active timers</p>
                <p className="text-sm text-muted-foreground">Start a timer from the + menu</p>
              </div>
            ) : (
              timers.map((timer) => (
                <div key={timer.id} className="space-y-3">
                  <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{timer.taskTitle}</h4>
                      {timer.projectName && (
                        <p className="text-xs text-muted-foreground">{timer.projectName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="font-mono text-lg font-bold">
                          {formatTime(timer.elapsed)}
                        </div>
                        <div className="flex gap-1">
                          {timer.isActive && !timer.isPaused && (
                            <Badge variant="default" className="text-xs">
                              {timer.isLocalOnly ? "Local" : "Active"}
                            </Badge>
                          )}
                          {timer.isPaused && (
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
                        onClick={() => handlePauseTimer(timer.id)}
                        className={cn(
                          "h-8 w-8 p-0",
                          timer.isPaused ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"
                        )}
                      >
                        {timer.isPaused ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStopTimer(timer)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTimer(timer.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stop Timer Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedTimer && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Task</p>
                  <p>{selectedTimer.taskTitle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Time Elapsed</p>
                  <p className="font-mono text-lg">{formatTime(selectedTimer.elapsed)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <Textarea 
                    placeholder="What did you work on?" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => selectedTimer && handleDeleteTimer(selectedTimer.id)}
            >
              Delete Timer
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmStopTimer}>Save Time Entry</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}