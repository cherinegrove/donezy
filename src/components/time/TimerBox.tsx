import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Play, Pause, Save, Timer, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  isLocalOnly: boolean; // New flag to indicate if this is a local-only timer
}

interface TimerBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimerBox({ isOpen, onClose }: TimerBoxProps) {
  const { activeTimeEntry, tasks, projects, clients, stopTimeTracking, startTimeTracking, isTimerPaused, pauseTimeTracking, resumeTimeTracking, getElapsedTime, addTimeEntry, currentUser } = useAppContext();
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");
  const [newlyCreatedTimerId, setNewlyCreatedTimerId] = useState<string | null>(null);

  // Load timers from localStorage on mount
  useEffect(() => {
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      try {
        const parsed = JSON.parse(savedTimers);
        setTimers(parsed.map((t: any) => ({
          ...t,
          startTime: new Date(t.startTime),
          pausedAt: t.pausedAt ? new Date(t.pausedAt) : undefined
        })));
      } catch (error) {
        console.error('Error loading timers:', error);
        localStorage.removeItem('activeTimers');
      }
    }
  }, []);

  // Listen for pause events from AppContext
  useEffect(() => {
    const handlePauseActive = (event: CustomEvent) => {
      const { timerId } = event.detail;
      console.log('📢 Received pauseActiveTimer event for:', timerId);
      
      // Convert the active backend timer to a local-only paused timer
      setTimers(prev => prev.map(t => 
        t.id === timerId 
          ? { ...t, isActive: false, isPaused: true, pausedAt: new Date(), isLocalOnly: true }
          : t
      ));
    };

    window.addEventListener('pauseActiveTimer', handlePauseActive as EventListener);
    return () => window.removeEventListener('pauseActiveTimer', handlePauseActive as EventListener);
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
    
    // Notify other components that timers have been updated
    window.dispatchEvent(new CustomEvent('timersUpdated'));
  }, [timers]);

  // Handle activeTimeEntry from backend - create timer UI representation
  useEffect(() => {
    if (activeTimeEntry) {
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      const client = clients.find(c => c.id === activeTimeEntry.clientId);
      
      // Check if we already have this timer
      const existingTimer = timers.find(t => t.id === activeTimeEntry.id);
      
      if (!existingTimer) {
        console.log('➕ Adding new backend timer to UI');
        const newTimer: TimerItem = {
          id: activeTimeEntry.id,
          taskId: activeTimeEntry.taskId || '',
          taskTitle: task?.title || 'Unknown Task',
          projectName: project?.name,
          clientName: client?.name,
          startTime: new Date(activeTimeEntry.startTime),
          elapsed: 0,
          isPaused: isTimerPaused,
          pausedAt: isTimerPaused ? new Date() : undefined,
          totalPausedTime: 0,
          isActive: !isTimerPaused,
          isLocalOnly: false
        };
        
        setTimers(prev => [...prev, newTimer]);
      } else {
        // Update existing timer's pause state
        setTimers(prev => prev.map(t => 
          t.id === activeTimeEntry.id 
            ? { ...t, isPaused: isTimerPaused, isActive: !isTimerPaused, isLocalOnly: false }
            : t
        ));
      }
    }
  }, [activeTimeEntry, isTimerPaused, tasks, projects, clients]);

  // Update elapsed time for active timers (both local and backend)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        // For backend timers, use the shared elapsed time calculation
        if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
          const elapsedTimeStr = getElapsedTime(activeTimeEntry);
          const [hours, minutes, seconds] = elapsedTimeStr.split(':').map(Number);
          timer.elapsed = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        } else if (timer.isActive && !timer.isPaused) {
          // For local-only timers, keep the existing calculation
          const now = Date.now();
          const startTime = timer.startTime.getTime();
          const pausedTime = timer.totalPausedTime || 0;
          timer.elapsed = now - startTime - pausedTime;
        }
        return timer;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimeEntry, getElapsedTime]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePauseTimer = async (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    // RULE: Resuming a timer pauses all other timers
    if (timer.isPaused) {
      console.log('▶️ Resuming timer:', timerId);
      
      // First, pause/stop the currently active backend timer if exists
      if (activeTimeEntry && !isTimerPaused) {
        console.log('⏸️ Pausing current backend timer');
        await stopTimeTracking('Auto-paused when resuming another timer');
        
        // Convert it to a local paused timer
        setTimers(prev => prev.map(t => 
          t.id === activeTimeEntry.id 
            ? { ...t, isActive: false, isPaused: true, pausedAt: new Date(), isLocalOnly: true }
            : t
        ));
      }
      
      // Pause all other active local timers
      setTimers(prev => prev.map(t => {
        if (t.id !== timerId && t.isActive && !t.isPaused) {
          return { ...t, isPaused: true, pausedAt: new Date(), isActive: false };
        }
        return t;
      }));
      
      // Start this timer as a new backend timer
      await startTimeTracking(timer.taskId);
      
      // Remove the old local timer entry (it will be recreated by the activeTimeEntry effect)
      setTimers(prev => prev.filter(t => t.id !== timerId));
      
    } else if (timer.isActive && !timer.isPaused) {
      // RULE: Pausing a timer
      console.log('⏸️ Pausing timer:', timerId);
      
      if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
        // Pause backend timer
        pauseTimeTracking();
      } else {
        // Pause local timer
        setTimers(prev => prev.map(t => t.id === timerId ? {
          ...t,
          isPaused: true,
          pausedAt: new Date(),
          isActive: false
        } : t));
      }
    }
  };

  const handleStopTimer = (timer: TimerItem) => {
    setSelectedTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmStopTimer = async () => {
    if (!selectedTimer || !currentUser) return;

    try {
      // Calculate final duration in minutes
      const durationMinutes = Math.floor(selectedTimer.elapsed / (1000 * 60));
      const endTime = new Date();
      const startTime = selectedTimer.startTime;

      if (selectedTimer.isLocalOnly) {
        // For local-only timers, create a completed time entry directly in the database
        console.log('💾 Saving local timer as completed time entry');
        
        const task = tasks.find(t => t.id === selectedTimer.taskId);
        const project = projects.find(p => p.id === task?.projectId);
        
        await addTimeEntry({
          userId: currentUser.id,
          taskId: selectedTimer.taskId,
          projectId: project?.id || null,
          clientId: project?.clientId || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: durationMinutes,
          description: notes || null,
          billable: true,
          status: 'pending',
        });
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

  const handleDeleteTimer = async (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    console.log('🗑️ Deleting timer:', timerId);
    
    // If this is the active backend timer, stop it properly
    if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
      await stopTimeTracking('Timer deleted');
    }
    
    // Remove from local state
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
              timers.map((timer) => {
                console.log('🖼️ Rendering timer:', {
                  id: timer.id.slice(0, 8),
                  clientName: timer.clientName,
                  isActive: timer.isActive,
                  isPaused: timer.isPaused,
                  isLocalOnly: timer.isLocalOnly,
                  shouldShowPlay: !timer.isActive || timer.isPaused || (!timer.isLocalOnly && isTimerPaused),
                  backendIsTimerPaused: isTimerPaused
                });
                return (
                <div key={timer.id} className="space-y-3">
                  <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{timer.taskTitle}</h4>
                      {timer.projectName && (
                        <p className="text-xs text-muted-foreground">{timer.projectName}</p>
                      )}
                      {timer.clientName && (
                        <p className="text-xs text-muted-foreground/80">Client: {timer.clientName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="font-mono text-lg font-bold">
                          {formatTime(timer.elapsed)}
                        </div>
                         <div className="flex gap-1">
                           {timer.isActive && !timer.isPaused && !(!timer.isLocalOnly && isTimerPaused) && (
                             <Badge variant="default" className="text-xs">
                               Live
                             </Badge>
                           )}
                           {(timer.isPaused || (!timer.isLocalOnly && isTimerPaused)) && (
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
                           console.log('🖱️ Button clicked for timer:', timer.id.slice(0, 8), timer.clientName);
                           handlePauseTimer(timer.id);
                         }}
                          className={cn(
                            "h-8 w-8 p-0",
                            (!timer.isActive || timer.isPaused || (!timer.isLocalOnly && isTimerPaused)) ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"
                          )}
                        >
                          {(!timer.isActive || timer.isPaused || (!timer.isLocalOnly && isTimerPaused)) ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStopTimer(timer)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                      >
                        <Save className="h-4 w-4" />
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
                );
              })
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