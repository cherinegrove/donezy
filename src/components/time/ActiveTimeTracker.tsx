import { Button } from "@/components/ui/button";
import { Clock, Play, Pause, Square, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
}

export function ActiveTimeTracker() {
  const { 
    activeTimeEntry, 
    stopTimeTracking, 
    deleteTimeEntry, 
    tasks, 
    projects, 
    clients, 
    getElapsedTime, 
    isTimerPaused, 
    pauseTimeTracking, 
    resumeTimeTracking,
    startTimeTracking 
  } = useAppContext();
  
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");

  // Load timers from localStorage on mount
  useEffect(() => {
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      try {
        const parsedTimers = JSON.parse(savedTimers).map((timer: any) => ({
          ...timer,
          startTime: new Date(timer.startTime),
          pausedAt: timer.pausedAt ? new Date(timer.pausedAt) : undefined
        }));
        setTimers(parsedTimers);
      } catch (error) {
        console.error('Error loading timers from localStorage:', error);
      }
    }
  }, []);

  // Sync with activeTimeEntry from backend
  useEffect(() => {
    if (activeTimeEntry) {
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      const client = clients.find(c => c.id === activeTimeEntry.clientId);
      
      const existingTimer = timers.find(t => t.id === activeTimeEntry.id);
      
      if (!existingTimer) {
        const now = new Date();
        const timerItem: TimerItem = {
          id: activeTimeEntry.id,
          taskId: activeTimeEntry.taskId,
          taskTitle: task?.title || `Task (${activeTimeEntry.taskId.slice(0, 8)}...)`,
          projectName: project?.name,
          clientName: client?.name,
          startTime: now,
          elapsed: 0,
          isPaused: false,
          totalPausedTime: 0,
          isActive: true,
          isLocalOnly: false
        };
        
        // Convert existing backend timers to local paused timers
        setTimers(prev => {
          const updatedTimers = prev.map(existingTimer => {
            if (!existingTimer.isLocalOnly) {
              return {
                ...existingTimer,
                isActive: false,
                isPaused: true,
                pausedAt: new Date(),
                isLocalOnly: true
              };
            }
            return existingTimer;
          });
          
          return [...updatedTimers, timerItem];
        });
      }
    }
  }, [activeTimeEntry, tasks, projects, clients]);

  // Update elapsed time for all timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
          const elapsedTimeStr = getElapsedTime(activeTimeEntry);
          const [hours, minutes, seconds] = elapsedTimeStr.split(':').map(Number);
          timer.elapsed = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        } else if (timer.isActive && !timer.isPaused) {
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

  // Save timers to localStorage
  useEffect(() => {
    if (timers.length > 0) {
      localStorage.setItem('activeTimers', JSON.stringify(timers));
    }
  }, [timers]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePauseTimer = (timer: TimerItem) => {
    if (timer.isLocalOnly) {
      // Handle local timer pause/resume
      setTimers(prev => prev.map(t => {
        if (t.id === timer.id) {
          if (t.isPaused) {
            // Resume
            const now = new Date();
            const pauseDuration = t.pausedAt ? now.getTime() - t.pausedAt.getTime() : 0;
            return {
              ...t,
              isPaused: false,
              pausedAt: undefined,
              totalPausedTime: (t.totalPausedTime || 0) + pauseDuration
            };
          } else {
            // Pause
            return {
              ...t,
              isPaused: true,
              pausedAt: new Date()
            };
          }
        }
        return t;
      }));
    } else {
      // Handle backend timer pause/resume
      if (timer.isPaused) {
        resumeTimeTracking();
      } else {
        pauseTimeTracking();
      }
    }
  };

  const handleStopTimer = (timer: TimerItem) => {
    setSelectedTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmStopTimer = () => {
    if (!selectedTimer) return;

    if (selectedTimer.isLocalOnly) {
      // For local timers, we might need to create a time entry
      // For now, just remove it from the list
      setTimers(prev => prev.filter(t => t.id !== selectedTimer.id));
    } else {
      // For backend timers, use the context function
      stopTimeTracking(notes);
      setTimers(prev => prev.filter(t => t.id !== selectedTimer.id));
    }

    setStopDialogOpen(false);
    setSelectedTimer(null);
    setNotes("");
  };

  const handleDeleteTimer = (timer: TimerItem) => {
    if (timer.isLocalOnly) {
      setTimers(prev => prev.filter(t => t.id !== timer.id));
    } else {
      deleteTimeEntry(timer.id);
      setTimers(prev => prev.filter(t => t.id !== timer.id));
    }
  };

  if (timers.length === 0) return null;

  return (
    <>
      <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
        <div className="py-2 px-4">
          <div className="flex items-center mb-2">
            <Clock className="mr-2 h-4 w-4 text-green-700 dark:text-green-500" />
            <span className="text-sm font-medium text-green-800 dark:text-green-400">
              Active Timers ({timers.length})
            </span>
          </div>
          
          <div className="space-y-2">
            {timers.map((timer, index) => (
              <div key={timer.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{timer.taskTitle}</span>
                        <div className="flex items-center gap-1">
                          {timer.isActive && !timer.isPaused && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Active
                            </Badge>
                          )}
                          {timer.isPaused && (
                            <Badge variant="secondary" className="text-xs">
                              Paused
                            </Badge>
                          )}
                          {timer.isLocalOnly && (
                            <Badge variant="outline" className="text-xs">
                              Local
                            </Badge>
                          )}
                        </div>
                      </div>
                      {timer.projectName && (
                        <span className="text-xs text-green-600 dark:text-green-400 truncate">{timer.projectName}</span>
                      )}
                      {timer.clientName && (
                        <span className="text-xs text-green-600/80 dark:text-green-400/80 truncate">Client: {timer.clientName}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-sm font-mono font-bold">
                      {formatTime(timer.elapsed)}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePauseTimer(timer)}
                      >
                        {timer.isPaused ? (
                          <Play className="h-3 w-3" />
                        ) : (
                          <Pause className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleStopTimer(timer)}
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTimer(timer)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {index < timers.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Time Tracking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-1">Task</p>
              <p>{selectedTimer?.taskTitle}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Time Elapsed</p>
              <p className="font-mono">{selectedTimer ? formatTime(selectedTimer.elapsed) : '00:00:00'}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Notes</p>
              <Textarea 
                placeholder="What did you work on?" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedTimer) {
                  handleDeleteTimer(selectedTimer);
                  setStopDialogOpen(false);
                  setSelectedTimer(null);
                  setNotes("");
                }
              }}
            >
              Delete Entry
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