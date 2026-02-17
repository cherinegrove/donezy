import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Play, Pause, Save, Timer, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TimeEntryEventLog } from "@/components/time/TimeEntryEventLog";
import { fetchTimeEntryEvents } from "@/utils/timeEntryEventLogger";

interface TimerItem {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName?: string;
  clientName?: string;
  startTime: Date;
  elapsed: number; // Elapsed time at moment of pause (if paused)
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedTime: number; // Accumulated paused time in milliseconds
  isActive: boolean;
  isLocalOnly: boolean; // New flag to indicate if this is a local-only timer
  userId?: string; // Track which user this timer belongs to
  projectId?: string; // Store projectId for creating time entries
  clientId?: string; // Store clientId for creating time entries
}

interface TimerBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimerBox({ isOpen, onClose }: TimerBoxProps) {
  const { activeTimeEntry, tasks, projects, clients, stopTimeTracking, startTimeTracking, isTimerPaused, pauseTimeTracking, resumeTimeTracking, getElapsedTime, addTimeEntry, currentUser, pausedTimeEntries } = useAppContext();
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");
  const [newlyCreatedTimerId, setNewlyCreatedTimerId] = useState<string | null>(null);
  const [expandedTimerId, setExpandedTimerId] = useState<string | null>(null);

  // Load timers from localStorage on mount - filter to current user only and validate against backend
  useEffect(() => {
    const savedTimers = localStorage.getItem('activeTimers');
    if (savedTimers) {
      try {
        const parsed = JSON.parse(savedTimers);
        // Filter to only show current user's timers
        const userTimers = parsed.filter((t: any) => !t.userId || t.userId === currentUser?.id);
        
        // Only load LOCAL-ONLY timers from localStorage
        // Backend timers will be synced from activeTimeEntry
        const localOnlyTimers = userTimers
          .filter((t: any) => t.isLocalOnly === true)
          .map((t: any) => ({
            ...t,
            startTime: new Date(t.startTime),
            pausedAt: t.pausedAt ? new Date(t.pausedAt) : undefined
          }));
        
        console.log('📂 Loading local-only timers from storage:', localOnlyTimers.length);
        setTimers(localOnlyTimers);
      } catch (error) {
        console.error('Error loading timers:', error);
        localStorage.removeItem('activeTimers');
      }
    }
  }, [currentUser?.id]);

  // Listen for pause events from AppContext when starting a new timer
  useEffect(() => {
    const handlePauseActive = (event: CustomEvent) => {
      const { timerId, elapsed, totalPausedTime: pausedTime } = event.detail;
      console.log('📢 Received pauseActiveTimer event for:', timerId, 'elapsed:', elapsed);
      
      // Timer is already paused in DB - just update UI state
      // Do NOT convert to isLocalOnly - keep it as DB-backed
      setTimers(prev => {
        const existingTimer = prev.find(t => t.id === timerId);
        if (existingTimer) {
          return prev.map(t => 
            t.id === timerId 
              ? { 
                  ...t, 
                  isActive: false, 
                  isPaused: true, 
                  pausedAt: new Date(), 
                  isLocalOnly: false, // KEEP as DB-backed
                  elapsed: elapsed || t.elapsed,
                  totalPausedTime: pausedTime || t.totalPausedTime
                }
              : t
          );
        }
        return prev;
      });
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

  // Track the last known activeTimeEntry ID to detect when it's cleared
  const [lastActiveEntryId, setLastActiveEntryId] = useState<string | null>(null);

  // Handle activeTimeEntry from backend - create timer UI representation
  useEffect(() => {
    if (activeTimeEntry) {
      // Track this entry ID
      setLastActiveEntryId(activeTimeEntry.id);
      
      const task = tasks.find(t => t.id === activeTimeEntry.taskId);
      const project = projects.find(p => p.id === task?.projectId);
      const client = clients.find(c => c.id === activeTimeEntry.clientId);
      
      setTimers(prev => {
        // Check if we already have this timer
        const existingTimer = prev.find(t => t.id === activeTimeEntry.id);
        
        // Also check for duplicate timers for the same task (could happen during race conditions)
        const duplicateTaskTimer = prev.find(t => 
          t.id !== activeTimeEntry.id && 
          t.taskId === activeTimeEntry.taskId && 
          !t.isLocalOnly
        );
        
        // Remove any duplicate task timers first
        let filteredTimers = duplicateTaskTimer 
          ? prev.filter(t => t.id !== duplicateTaskTimer.id)
          : prev;
        
        if (!existingTimer) {
          console.log('➕ Adding new backend timer to UI');
          const newTimer: TimerItem = {
            id: activeTimeEntry.id,
            taskId: activeTimeEntry.taskId || '',
            taskTitle: task?.title || 'Unknown Task',
            projectName: project?.name,
            clientName: client?.name,
            projectId: project?.id,
            clientId: client?.id || activeTimeEntry.clientId,
            startTime: new Date(activeTimeEntry.startTime),
            elapsed: 0,
            isPaused: isTimerPaused,
            pausedAt: isTimerPaused ? new Date() : undefined,
            totalPausedTime: 0,
            isActive: !isTimerPaused,
            isLocalOnly: false,
            userId: currentUser?.id // Add userId to track ownership
          };
          
          return [...filteredTimers, newTimer];
        } else {
          // Update existing timer's pause state
          return filteredTimers.map(t => 
            t.id === activeTimeEntry.id 
              ? { ...t, isPaused: isTimerPaused, isActive: !isTimerPaused, isLocalOnly: false }
              : t
          );
        }
      });
    } else if (lastActiveEntryId) {
      // activeTimeEntry was cleared - remove the corresponding timer from UI
      console.log('🗑️ Backend timer stopped, removing from UI:', lastActiveEntryId);
      setTimers(prev => prev.filter(t => t.id !== lastActiveEntryId || t.isLocalOnly));
      setLastActiveEntryId(null);
    }
  }, [activeTimeEntry, isTimerPaused, tasks, projects, clients, lastActiveEntryId]);

  // Calculate elapsed time for a paused timer from its events
  const calculatePausedElapsed = useCallback(async (entryId: string, startTime: Date): Promise<number> => {
    try {
      const events = await fetchTimeEntryEvents(entryId);
      
      let totalPauseDurationMs = 0;
      let lastPauseTimestamp: number | null = null;
      let lastEventTimestamp: number = startTime.getTime();
      
      for (const event of events) {
        const eventTime = new Date(event.event_timestamp).getTime();
        
        if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
          lastPauseTimestamp = eventTime;
        } else if (event.event_type === 'resumed' && lastPauseTimestamp !== null) {
          totalPauseDurationMs += eventTime - lastPauseTimestamp;
          lastPauseTimestamp = null;
        }
        
        lastEventTimestamp = eventTime;
      }
      
      // If still paused (last event was a pause), elapsed = pauseTime - startTime - totalPauseDuration
      if (lastPauseTimestamp !== null) {
        const elapsed = lastPauseTimestamp - startTime.getTime() - totalPauseDurationMs;
        return Math.max(0, elapsed);
      }
      
      // Fallback: use last event time
      const elapsed = lastEventTimestamp - startTime.getTime() - totalPauseDurationMs;
      return Math.max(0, elapsed);
    } catch (err) {
      console.error('Error calculating paused elapsed:', err);
      return 0;
    }
  }, []);

  // Sync DB-backed paused timers into the timer list
  useEffect(() => {
    if (!pausedTimeEntries || pausedTimeEntries.length === 0) return;
    
    const syncPausedTimers = async () => {
      const newTimers: TimerItem[] = [];
      
      for (const entry of pausedTimeEntries) {
        const startTime = new Date(entry.startTime);
        const task = tasks.find(t => t.id === entry.taskId);
        const project = entry.projectId ? projects.find(p => p.id === entry.projectId) : null;
        const client = project?.clientId ? clients.find(c => c.id === project.clientId) : null;
        
        // Calculate elapsed from events
        const elapsed = await calculatePausedElapsed(entry.id, startTime);
        
        newTimers.push({
          id: entry.id,
          taskId: entry.taskId || '',
          taskTitle: task?.title || 'Unknown Task',
          projectName: project?.name,
          clientName: client?.name,
          projectId: entry.projectId,
          clientId: entry.clientId || project?.clientId,
          startTime,
          elapsed,
          isPaused: true,
          pausedAt: undefined,
          totalPausedTime: 0,
          isActive: false,
          isLocalOnly: false,
          userId: currentUser?.id,
        });
      }
      
      setTimers(prev => {
        let updated = [...prev];
        for (const newTimer of newTimers) {
          const existingIdx = updated.findIndex(t => t.id === newTimer.id);
          if (existingIdx === -1) {
            updated.push(newTimer);
          } else if (updated[existingIdx].elapsed === 0 && newTimer.elapsed > 0) {
            // Update elapsed if it was 0 (not yet calculated)
            updated[existingIdx] = { ...updated[existingIdx], elapsed: newTimer.elapsed };
          }
        }
        // Remove timers that are no longer in pausedTimeEntries
        const pausedIds = new Set(pausedTimeEntries.map(e => e.id));
        updated = updated.filter(t => t.isLocalOnly || !t.isPaused || t.id === activeTimeEntry?.id || pausedIds.has(t.id));
        return updated;
      });
    };
    
    syncPausedTimers();
  }, [pausedTimeEntries, tasks, projects, clients, calculatePausedElapsed]);

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
      console.log('▶️ Resuming timer:', timerId, 'with elapsed:', timer.elapsed, 'ms');
      
      // First, the currently active backend timer will be auto-paused by startTimeTracking
      // But for DB-backed paused timers, we should reactivate in DB instead of delete+recreate
      if (!timer.isLocalOnly) {
        // DB-backed paused timer - reactivate it directly
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Pause current active timer if exists
          if (activeTimeEntry && !isTimerPaused) {
            await supabase
              .from('time_entries')
              .update({ timer_status: 'paused' })
              .eq('id', activeTimeEntry.id);
            
            await supabase.from('time_entry_events').insert({
              time_entry_id: activeTimeEntry.id,
              auth_user_id: currentUser?.auth_user_id || currentUser?.id || '',
              event_type: 'auto_paused',
              event_timestamp: new Date().toISOString(),
              details: { reason: 'Another timer resumed', pausedAt: new Date().toISOString() }
            });
          }
          
          // Reactivate this paused timer
          await supabase
            .from('time_entries')
            .update({ timer_status: 'active' })
            .eq('id', timer.id);
          
          // Calculate pause duration so restore logic can reconstruct totalPausedTime
          const pauseDuration = timer.pausedAt 
            ? Date.now() - timer.pausedAt.getTime() 
            : 0;
          
          await supabase.from('time_entry_events').insert({
            time_entry_id: timer.id,
            auth_user_id: currentUser?.auth_user_id || currentUser?.id || '',
            event_type: 'resumed',
            event_timestamp: new Date().toISOString(),
            details: { 
              resumedAt: new Date().toISOString(),
              pauseDuration,
              pauseDurationMinutes: Math.floor(pauseDuration / (1000 * 60))
            }
          });
          
          console.log('✅ Timer resumed in DB (no delete):', timer.id);
          window.dispatchEvent(new CustomEvent('timersUpdated'));
          window.location.reload();
        } catch (err) {
          console.error('Error resuming DB timer:', err);
        }
      } else {
        // Legacy local-only timer - use the old flow
        if (activeTimeEntry && !isTimerPaused) {
          await stopTimeTracking('Auto-paused when resuming another timer');
        }
        
        await startTimeTracking(timer.taskId, timer.projectId, timer.clientId, timer.elapsed);
        setTimers(prev => prev.filter(t => t.id !== timerId));
      }
      
    } else if (timer.isActive && !timer.isPaused) {
      // RULE: Pausing a timer - MUST calculate and store elapsed time at this moment
      console.log('⏸️ Pausing timer:', timerId);
      
      // Calculate elapsed time right now before pausing
      const now = Date.now();
      const elapsedAtPause = now - timer.startTime.getTime() - (timer.totalPausedTime || 0);
      
      if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
        // Pause backend timer - update local state IMMEDIATELY to prevent flicker
        setTimers(prev => prev.map(t => t.id === timerId ? {
          ...t,
          isPaused: true,
          pausedAt: new Date(),
          isActive: false,
          elapsed: elapsedAtPause // Store the elapsed time at pause
        } : t));
        // Then sync with backend (async)
        pauseTimeTracking();
      } else {
        // Pause local timer
        setTimers(prev => prev.map(t => t.id === timerId ? {
          ...t,
          isPaused: true,
          pausedAt: new Date(),
          isActive: false,
          elapsed: elapsedAtPause // Store the elapsed time at pause
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
      const endTime = new Date();
      const startTime = selectedTimer.startTime;
      
      // Calculate actual elapsed time at this moment (not from stale state)
      let actualElapsedMs: number;
      
      if (selectedTimer.isPaused) {
        // Timer is paused - use the elapsed time at pause
        actualElapsedMs = selectedTimer.elapsed;
      } else if (selectedTimer.isActive) {
        // Timer is actively running - calculate from start time minus paused time
        actualElapsedMs = endTime.getTime() - startTime.getTime() - (selectedTimer.totalPausedTime || 0);
      } else {
        // Timer is stopped/inactive - use the stored elapsed
        actualElapsedMs = selectedTimer.elapsed;
      }
      
      const durationMinutes = Math.floor(actualElapsedMs / (1000 * 60));
      
      console.log('💾 Saving timer:', {
        taskTitle: selectedTimer.taskTitle,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        calculatedElapsedMs: actualElapsedMs,
        storedElapsedMs: selectedTimer.elapsed,
        durationMinutes,
        isPaused: selectedTimer.isPaused,
        isActive: selectedTimer.isActive,
        isLocalOnly: selectedTimer.isLocalOnly,
        totalPausedTime: selectedTimer.totalPausedTime
      });

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
    
    console.log('🗑️ Cancelling timer:', timerId);
    
    // If this is the active backend timer, stop it properly
    if (!timer.isLocalOnly && activeTimeEntry && timer.id === activeTimeEntry.id) {
      await stopTimeTracking('Timer cancelled');
    } else if (!timer.isLocalOnly) {
      // DB-backed paused timer - soft-delete
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('time_entries')
          .update({ timer_status: 'cancelled', end_time: new Date().toISOString() })
          .eq('id', timerId);
      } catch (err) {
        console.error('Error cancelling DB timer:', err);
      }
    }
    
    // Remove from local UI state
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
                  
                  {/* Event Log Toggle */}
                  <button
                    onClick={() => setExpandedTimerId(expandedTimerId === timer.id ? null : timer.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-3 pb-2"
                  >
                    {expandedTimerId === timer.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Event Log
                  </button>
                  
                  {expandedTimerId === timer.id && (
                    <div className="border-t bg-muted/30 rounded-b-lg max-h-48 overflow-y-auto">
                      <TimeEntryEventLog timeEntryId={timer.id} />
                    </div>
                  )}
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