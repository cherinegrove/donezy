import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, Save, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TimeEntry } from "@/types";
import { format } from "date-fns";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";

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
  isLocalOnly: boolean;
  userId?: string; // Track which user this timer belongs to
  projectId?: string; // Store projectId for creating time entries
  clientId?: string; // Store clientId for creating time entries
}

interface AllActiveTimer {
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
  userId?: string;
  userName?: string;
  isOtherUser?: boolean;
  rawEntry?: any;
  cachedElapsed?: number; // Pre-computed elapsed time accounting for pauses
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
  allActiveTimers?: AllActiveTimer[];
  isSuperAdmin?: boolean;
}

export function ActiveTimersSection({
  activeTimer,
  localTimers,
  isTimerPaused,
  onPauseTimer,
  onStopTimer,
  onEditTimer,
  allActiveTimers = [],
  isSuperAdmin = false,
}: ActiveTimersSectionProps) {
  const { 
    stopTimeTracking, 
    startTimeTracking, 
    pauseTimeTracking, 
    activeTimeEntry, 
    addTimeEntry, 
    currentUser,
    tasks,
    projects,
    users,
    clients,
    customRoles
  } = useAppContext();
  
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedLocalTimer, setSelectedLocalTimer] = useState<TimerItem | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Check if current user is admin
  const isAdminUser = () => {
    if (!currentUser) return false;
    if (currentUser.roleId === 'admin') return true;
    const userRole = customRoles.find(r => r.id === currentUser.roleId);
    return userRole?.name === 'Admin';
  };

  // Set default filter to current user on mount
  useEffect(() => {
    if (currentUser && !selectedFilters.user?.length) {
      setSelectedFilters(prev => ({
        ...prev,
        user: [currentUser.id]
      }));
    }
  }, [currentUser]);

  const filterOptions: FilterOption[] = [
    // Only show user filter for admins/super admins
    ...(isAdminUser() || isSuperAdmin ? [{
      id: "user",
      name: "User",
      options: users.map(user => ({
        id: user.id,
        label: user.name
      }))
    }] : []),
    {
      id: "client",
      name: "Client",
      options: clients.map(client => ({
        id: client.id,
        label: client.name
      }))
    },
    {
      id: "project",
      name: "Project",
      options: projects.map(project => ({
        id: project.id,
        label: project.name
      }))
    }
  ];

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor((milliseconds / 1000) % 60);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleLocalTimerPause = async (timer: TimerItem) => {
    if (timer.isPaused) {
      // Resume: start as new backend timer, preserving elapsed time
      console.log('▶️ Resuming local timer:', timer.id.slice(0, 8), 'with elapsed:', timer.elapsed, 'ms');
      
      // Stop current backend timer if running
      if (activeTimeEntry && !isTimerPaused) {
        await stopTimeTracking('Auto-paused when resuming another timer');
      }
      
      // Start this timer with preserved elapsed time
      // Pass elapsed time so the start_time is set in the past to preserve duration
      await startTimeTracking(timer.taskId, timer.projectId, timer.clientId, timer.elapsed);
      
      // Remove from localStorage
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        const parsed = JSON.parse(savedTimers);
        const filtered = parsed.filter((t: any) => t.id !== timer.id);
        localStorage.setItem('activeTimers', JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('timersUpdated'));
      }
    } else {
      // Pause: calculate elapsed time NOW and update in localStorage
      console.log('⏸️ Pausing local timer:', timer.id.slice(0, 8));
      
      // Calculate elapsed time at this moment
      const now = Date.now();
      const elapsedAtPause = now - new Date(timer.startTime).getTime() - (timer.totalPausedTime || 0);
      
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        const parsed = JSON.parse(savedTimers);
        const updated = parsed.map((t: any) => 
          t.id === timer.id 
            ? { 
                ...t, 
                isPaused: true, 
                pausedAt: new Date().toISOString(), 
                isActive: false,
                elapsed: elapsedAtPause // Store elapsed time at pause
              }
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

  // Helper to get project ID from a timer
  const getTimerProjectId = (timer: any): string | undefined => {
    if (timer.projectId) return timer.projectId;
    if (timer.taskId) {
      const task = tasks.find(t => t.id === timer.taskId);
      return task?.projectId;
    }
    return undefined;
  };

  // Helper to get client ID from a timer
  const getTimerClientId = (timer: any): string | undefined => {
    if (timer.clientId) return timer.clientId;
    const projectId = getTimerProjectId(timer);
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      return project?.clientId;
    }
    return undefined;
  };

  // Helper to get user ID from a timer
  const getTimerUserId = (timer: any): string | undefined => {
    if (timer.userId) {
      // Check if it matches a user.id or user.auth_user_id
      const userById = users.find(u => u.id === timer.userId);
      if (userById) return userById.id;
      const userByAuthId = users.find(u => u.auth_user_id === timer.userId);
      if (userByAuthId) return userByAuthId.id;
    }
    return currentUser?.id;
  };

  // Filter function for timers
  const matchesFilters = (timer: any): boolean => {
    // User filter
    if (selectedFilters.user?.length > 0) {
      const timerId = getTimerUserId(timer);
      if (!timerId || !selectedFilters.user.includes(timerId)) {
        return false;
      }
    } else if (!isAdminUser() && !isSuperAdmin) {
      // Non-admins always filter to their own timers
      const timerId = getTimerUserId(timer);
      if (timerId !== currentUser?.id) {
        return false;
      }
    }

    // Project filter
    if (selectedFilters.project?.length > 0) {
      const projectId = getTimerProjectId(timer);
      if (!projectId || !selectedFilters.project.includes(projectId)) {
        return false;
      }
    }

    // Client filter
    if (selectedFilters.client?.length > 0) {
      const clientId = getTimerClientId(timer);
      if (!clientId || !selectedFilters.client.includes(clientId)) {
        return false;
      }
    }

    return true;
  };

  // Combine all timers into a unified list matching TimerBox style
  const myTimers: (TimerItem & { userName?: string; isOtherUser?: boolean })[] = [];

  // Add backend timer if exists (current user's active timer)
  if (activeTimer) {
    myTimers.push({
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
      userName: currentUser?.name,
      isOtherUser: false,
      projectId: activeTimer.project?.id,
      clientId: activeTimer.client?.id,
    });
  }

  // Add local timers
  localTimers.forEach(timer => {
    // Don't duplicate if it's the same as backend timer
    if (!myTimers.find(t => t.id === timer.id)) {
      myTimers.push({
        ...timer,
        userName: currentUser?.name,
        isOtherUser: false,
      });
    }
  });

  // For super admins, add other users' active timers
  // These already have cachedElapsed pre-computed with pauses accounted for
  const otherUsersTimersWithElapsed = useMemo(() => {
    if (!isSuperAdmin) return [];
    return allActiveTimers
      .filter(timer => timer.isOtherUser && !myTimers.find(t => t.id === timer.id))
      .map(timer => ({
        ...timer,
        // Use pre-computed cachedElapsed from fetchAllActiveTimers if available
        // This already accounts for paused time
        cachedElapsed: timer.cachedElapsed !== undefined 
          ? timer.cachedElapsed 
          : timer.elapsed || 0
      }));
  }, [isSuperAdmin, allActiveTimers, myTimers.map(t => t.id).join(',')]);

  // Combine my timers + other users' timers and apply filters
  const allTimers = [...myTimers, ...otherUsersTimersWithElapsed];
  const displayTimers = allTimers.filter(matchesFilters);

  // Show filter bar and empty state
  const showFilters = filterOptions.length > 0;

  if (displayTimers.length === 0) {
    return (
      <div className="space-y-4">
        {showFilters && (
          <FilterBar
            filters={filterOptions}
            selectedFilters={selectedFilters}
            onFilterChange={setSelectedFilters}
          />
        )}
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No active timers</p>
          <p className="text-sm text-muted-foreground">Start a timer from the + menu or from a task</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <FilterBar
          filters={filterOptions}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />
      )}
      <div className="space-y-3">
        {displayTimers.map((timer: any) => {
          const isBackendTimer = !timer.isLocalOnly && activeTimer && timer.id === activeTimer.timeEntry.id;
          const isOtherUserTimer = timer.isOtherUser;
          const now = Date.now();
          
          // For other users' timers, use the cached (static) elapsed time
          // For current user's timers, calculate real-time
          let elapsed: number;
          if (isOtherUserTimer && timer.cachedElapsed !== undefined) {
            // Use pre-computed cached elapsed time - won't tick on re-renders
            elapsed = timer.cachedElapsed;
          } else if (timer.isActive && !timer.isPaused && timer.isLocalOnly) {
            elapsed = now - timer.startTime.getTime() - (timer.totalPausedTime || 0);
          } else if (timer.isActive && !timer.isPaused) {
            elapsed = now - new Date(timer.startTime).getTime() - (timer.totalPausedTime || 0);
          } else {
            elapsed = timer.elapsed;
          }
          
          const displayTime = isBackendTimer ? activeTimer!.elapsedTime : formatTime(elapsed);
          
          // For other users' timers, we can't determine pause state - show as "Active" not "Live"
          // Only the current user's backend timer can show accurate Live/Paused state
          const isLive = isBackendTimer ? !isTimerPaused : (!isOtherUserTimer && timer.isActive && !timer.isPaused);
          const showPlayButton = isBackendTimer ? isTimerPaused : timer.isPaused;

          return (
            <div 
              key={timer.id} 
              className={cn(
                "flex items-start justify-between p-3 rounded-lg border bg-card",
                isOtherUserTimer && "border-muted-foreground/30"
              )}
            >
              <div className="flex-1 min-w-0">
                {isOtherUserTimer && timer.userName && (
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {timer.userName}
                    </Badge>
                  </div>
                )}
                <h4 className="font-medium text-sm truncate">{timer.taskTitle}</h4>
                {timer.projectName && (
                  <p className="text-xs text-muted-foreground">{timer.projectName}</p>
                )}
                {timer.clientName && (
                  <p className="text-xs text-muted-foreground/80">Client: {timer.clientName}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Started: {format(new Date(timer.startTime), "HH:mm")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="font-mono text-lg font-bold">
                    {displayTime}
                  </div>
                  <div className="flex gap-1">
                    {isOtherUserTimer ? (
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    ) : isLive ? (
                      <Badge variant="default" className="text-xs">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Only show controls for own timers, not other users' */}
              {!isOtherUserTimer && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isBackendTimer) {
                        onPauseTimer();
                      } else {
                        handleLocalTimerPause(timer as TimerItem);
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
                        handleLocalTimerStop(timer as TimerItem);
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
              )}
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
    </div>
  );
}