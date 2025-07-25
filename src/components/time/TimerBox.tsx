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
}

interface TimerBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimerBox({ isOpen, onClose }: TimerBoxProps) {
  const { activeTimeEntry, tasks, projects, stopTimeTracking, deleteTimeEntry } = useAppContext();
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");

  // Convert active time entry to timer item
  useEffect(() => {
    if (activeTimeEntry) {
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      
      const timerItem: TimerItem = {
        id: activeTimeEntry.id,
        taskId: activeTimeEntry.taskId,
        taskTitle: task?.title || "Unknown Task",
        projectName: project?.name,
        startTime: new Date(activeTimeEntry.startTime),
        elapsed: 0,
        isPaused: false,
        totalPausedTime: 0,
      };

      setTimers([timerItem]);
    } else {
      setTimers([]);
    }
  }, [activeTimeEntry, tasks, projects]);

  // Update elapsed time for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        if (!timer.isPaused) {
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
    setTimers(prev => prev.map(timer => {
      if (timer.id === timerId) {
        if (timer.isPaused) {
          // Resume timer
          const pauseDuration = Date.now() - (timer.pausedAt?.getTime() || 0);
          return {
            ...timer,
            isPaused: false,
            pausedAt: undefined,
            totalPausedTime: timer.totalPausedTime + pauseDuration,
          };
        } else {
          // Pause timer
          return {
            ...timer,
            isPaused: true,
            pausedAt: new Date(),
          };
        }
      }
      return timer;
    }));
  };

  const handleStopTimer = (timer: TimerItem) => {
    setSelectedTimer(timer);
    setStopDialogOpen(true);
  };

  const confirmStopTimer = () => {
    if (selectedTimer) {
      stopTimeTracking(notes);
      setStopDialogOpen(false);
      setSelectedTimer(null);
      setNotes("");
    }
  };

  const handleDeleteTimer = (timerId: string) => {
    deleteTimeEntry(timerId);
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
                        {timer.isPaused && (
                          <Badge variant="secondary" className="text-xs">
                            Paused
                          </Badge>
                        )}
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