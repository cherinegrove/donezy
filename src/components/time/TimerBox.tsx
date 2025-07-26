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
  isActive: boolean; // Only one timer can be active at a time
}

interface TimerBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimerBox({ isOpen, onClose }: TimerBoxProps) {
  const { activeTimeEntry, tasks, projects, stopTimeTracking, deleteTimeEntry, startTimeTracking } = useAppContext();
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");

  // Load timers from localStorage on mount and clean duplicates
  useEffect(() => {
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      const parsedTimers = JSON.parse(savedTimers).map((timer: any) => ({
        ...timer,
        startTime: new Date(timer.startTime),
        pausedAt: timer.pausedAt ? new Date(timer.pausedAt) : undefined
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

  // Update active timer when activeTimeEntry changes
  useEffect(() => {
    if (activeTimeEntry) {
      console.log('TimerBox - activeTimeEntry:', activeTimeEntry);
      console.log('TimerBox - tasks available:', tasks.length, tasks.map(t => ({ id: t.id, title: t.title })));
      
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      
      console.log('TimerBox - found task:', task);
      console.log('TimerBox - found project:', project);
      
      // Check if this timer already exists in our local list
      const existingTimerIndex = timers.findIndex(t => t.id === activeTimeEntry.id);
      
      // Check if we have a paused timer for the same task - if so, don't create a new one
      const existingTaskTimer = timers.find(t => t.taskId === activeTimeEntry.taskId && t.isPaused);
      
      if (existingTimerIndex === -1 && !existingTaskTimer) {
        // Only add new timer if it doesn't exist locally and no paused timer for same task
        const now = new Date();
        const dbStartTime = new Date(activeTimeEntry.startTime);
        const isNewTimer = (now.getTime() - dbStartTime.getTime()) < 5000; // Within 5 seconds
        
        const timerItem: TimerItem = {
          id: activeTimeEntry.id,
          taskId: activeTimeEntry.taskId,
          taskTitle: task?.title || `Task (${activeTimeEntry.taskId.slice(0, 8)}...)`,
          projectName: project?.name,
          startTime: isNewTimer ? now : dbStartTime, // Use current time for new timers
          elapsed: isNewTimer ? 0 : Math.max(0, now.getTime() - dbStartTime.getTime()),
          isPaused: false,
          totalPausedTime: 0,
          isActive: true,
        };
        
        console.log('TimerBox - creating new timer:', timerItem);
        console.log('TimerBox - isNewTimer:', isNewTimer, 'timeDiff:', now.getTime() - dbStartTime.getTime());
        
        // Mark all other timers as inactive and pause any that were running
        setTimers(prev => [
          ...prev.map(t => ({
            ...t,
            isActive: false,
            isPaused: t.isActive && !t.isPaused ? true : t.isPaused,
            pausedAt: t.isActive && !t.isPaused ? new Date() : t.pausedAt
          })),
          timerItem
        ]);
      } else if (existingTimerIndex !== -1) {
        // Update existing timer to be active and pause others
        setTimers(prev => prev.map((timer, index) => ({
          ...timer,
          isActive: index === existingTimerIndex,
          isPaused: index === existingTimerIndex ? false : (timer.isActive && !timer.isPaused ? true : timer.isPaused),
          pausedAt: index === existingTimerIndex ? undefined : (timer.isActive && !timer.isPaused ? new Date() : timer.pausedAt)
        })));
      } else if (existingTaskTimer) {
        // Resume the existing paused timer for this task, update its ID to match the new activeTimeEntry
        console.log('TimerBox - resuming existing paused timer for task:', existingTaskTimer.taskId);
        setTimers(prev => prev.map(timer => ({
          ...timer,
          id: timer.taskId === activeTimeEntry.taskId ? activeTimeEntry.id : timer.id, // Update ID
          isActive: timer.taskId === activeTimeEntry.taskId,
          isPaused: timer.taskId === activeTimeEntry.taskId ? false : (timer.isActive ? true : timer.isPaused),
          pausedAt: timer.taskId === activeTimeEntry.taskId ? undefined : (timer.isActive ? new Date() : timer.pausedAt)
        })));
      }
    } else {
      // Mark all timers as inactive when no active time entry
      setTimers(prev => prev.map(t => ({ ...t, isActive: false })));
    }
  }, [activeTimeEntry, tasks, projects]);

  // Update elapsed time for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const activeCount = prev.filter(t => t.isActive && !t.isPaused).length;
        if (activeCount > 1) {
          console.warn('MULTIPLE ACTIVE TIMERS DETECTED:', prev.filter(t => t.isActive));
        }
        
        return prev.map(timer => {
          if (timer.isActive && !timer.isPaused) {
            const now = Date.now();
            const startTime = timer.startTime.getTime();
            timer.elapsed = now - startTime - timer.totalPausedTime;
          }
          return timer;
        });
      });
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

  const handlePauseTimer = async (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;

    console.log('handlePauseTimer - timer:', timer);
    console.log('handlePauseTimer - all timers before:', timers.map(t => ({ id: t.id, isActive: t.isActive, isPaused: t.isPaused })));

    if (timer.isActive && !timer.isPaused) {
      // Pause the active timer - stop time tracking
      console.log('Pausing active timer');
      await stopTimeTracking();
      setTimers(prev => prev.map(t => t.id === timerId ? {
        ...t,
        isPaused: true,
        pausedAt: new Date(),
        isActive: false
      } : t));
    } else if (timer.isPaused || !timer.isActive) {
      // Resume paused timer or start inactive timer - first pause any currently running timer
      console.log('Resuming/starting timer');
      
      // Stop any currently active timer
      const currentlyActive = timers.find(t => t.isActive && !t.isPaused);
      if (currentlyActive && currentlyActive.id !== timerId) {
        console.log('Stopping currently active timer:', currentlyActive.id);
        await stopTimeTracking();
      }
      
      // Start time tracking for this task
      await startTimeTracking(timer.taskId);
      
      // Update timer states - ensure ONLY this timer is active
      const pauseDuration = timer.pausedAt ? Date.now() - timer.pausedAt.getTime() : 0;
      setTimers(prev => prev.map(t => ({
        ...t,
        isActive: t.id === timerId,
        isPaused: t.id === timerId ? false : (t.isActive ? true : t.isPaused),
        pausedAt: t.id === timerId ? undefined : (t.isActive ? new Date() : t.pausedAt),
        totalPausedTime: t.id === timerId ? (t.totalPausedTime || 0) + pauseDuration : t.totalPausedTime
      })));
    }
  };

  const handleStopTimer = (timer: TimerItem) => {
    setSelectedTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmStopTimer = async () => {
    if (selectedTimer) {
      if (selectedTimer.isActive) {
        await stopTimeTracking(notes);
      } else {
        // For paused timers, we need to start and immediately stop to create the time entry
        await startTimeTracking(selectedTimer.taskId);
        await stopTimeTracking(notes);
      }
      // Remove timer from list and update localStorage
      const updatedTimers = timers.filter(t => t.id !== selectedTimer.id);
      setTimers(updatedTimers);
      localStorage.setItem('activeTimers', JSON.stringify(updatedTimers));
      setStopDialogOpen(false);
      setSelectedTimer(null);
      setNotes("");
    }
  };

  const handleDeleteTimer = async (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (timer?.isActive) {
      await stopTimeTracking();
    }
    // Remove timer from list and update localStorage
    const updatedTimers = timers.filter(t => t.id !== timerId);
    setTimers(updatedTimers);
    localStorage.setItem('activeTimers', JSON.stringify(updatedTimers));
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
                              Active
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