import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertTriangle, Clock, Play, Search, Download, History, Eye, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { 
  fetchTimeEntryEvents, 
  formatEventType, 
  getEventIcon, 
  TimeEntryEvent,
  fetchAllRecentEvents
} from "@/utils/timeEntryEventLogger";

interface RawTimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  client_id: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export const TimeAudit = () => {
  const { users, projects, tasks, clients, currentUser } = useAppContext();
  const [entries, setEntries] = useState<RawTimeEntry[]>([]);
  const [allEvents, setAllEvents] = useState<TimeEntryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showReviewed, setShowReviewed] = useState(false);
  
  // Event detail dialog state
  const [selectedEntry, setSelectedEntry] = useState<RawTimeEntry | null>(null);
  const [entryEvents, setEntryEvents] = useState<TimeEntryEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Check if current user is a super admin (platform_admin or support_admin)
  const isSuperAdmin = currentUser?.systemRoles?.includes('platform_admin') || 
                       currentUser?.systemRoles?.includes('support_admin') ||
                       currentUser?.roleId === 'admin';

  const fetchEntries = async () => {
    setLoading(true);
    try {
      // First check auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 TimeAudit: Auth session:', session?.user?.id, session?.user?.email);
      
      if (!session?.user) {
        console.error('❌ TimeAudit: No authenticated user!');
        setLoading(false);
        return;
      }
      
      console.log('🔍 TimeAudit: Fetching entries as user:', currentUser?.name, 'System roles:', currentUser?.systemRoles);
      
      const [entriesResult, eventsResult] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(500),
        fetchAllRecentEvents(1000)
      ]);

      console.log('📊 TimeAudit: Query result:', { 
        error: entriesResult.error, 
        count: entriesResult.data?.length,
        status: entriesResult.status,
        statusText: entriesResult.statusText
      });

      if (entriesResult.error) {
        console.error('Error fetching time entries:', entriesResult.error);
      } else {
        console.log('📊 TimeAudit: Loaded', entriesResult.data?.length, 'entries');
        
        // Log active timers specifically
        const active = entriesResult.data?.filter(e => !e.end_time) || [];
        console.log('⏱️ Active timers found:', active.length, active.map(e => ({ id: e.id, user: e.user_id })));
        
        // Get unique user IDs to verify we're seeing all users' entries
        const uniqueUsers = new Set(entriesResult.data?.map(e => e.user_id));
        console.log('👥 Unique users in entries:', uniqueUsers.size, [...uniqueUsers]);
        
        setEntries(entriesResult.data || []);
      }
      
      setAllEvents(eventsResult);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId || u.auth_user_id === userId);
    return user?.name || userId?.slice(0, 8) + '...';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "-";
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId?.slice(0, 8) + '...';
  };

  const getTaskName = (taskId: string | null) => {
    if (!taskId) return "-";
    const task = tasks.find(t => t.id === taskId);
    return task?.title || taskId?.slice(0, 8) + '...';
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client?.name || clientId?.slice(0, 8) + '...';
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate actual active duration by subtracting pause time
  const calculateLiveDuration = (startTime: string, entryId: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const totalElapsedMs = now.getTime() - start.getTime();
    
    // Get all pause/resume events for this entry to calculate total pause time
    const entryEvents = allEvents.filter(e => e.time_entry_id === entryId);
    let totalPausedMs = 0;
    let lastPauseTime: Date | null = null;
    
    for (const event of entryEvents.sort((a, b) => 
      new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
    )) {
      if (event.event_type === 'paused') {
        lastPauseTime = new Date(event.event_timestamp);
      } else if (event.event_type === 'resumed' && lastPauseTime) {
        const resumeTime = new Date(event.event_timestamp);
        totalPausedMs += resumeTime.getTime() - lastPauseTime.getTime();
        lastPauseTime = null;
      }
    }
    
    // If still paused (no matching resume), add time from last pause to now
    if (lastPauseTime) {
      totalPausedMs += now.getTime() - lastPauseTime.getTime();
    }
    
    const activeMs = totalElapsedMs - totalPausedMs;
    const activeMinutes = Math.max(0, Math.floor(activeMs / (1000 * 60)));
    
    return formatDuration(activeMinutes);
  };

  // Get event count for an entry
  const getEventCount = (entryId: string) => {
    return allEvents.filter(e => e.time_entry_id === entryId).length;
  };

  // Open event details dialog
  const openEventDetails = async (entry: RawTimeEntry) => {
    setSelectedEntry(entry);
    setLoadingEvents(true);
    try {
      const events = await fetchTimeEntryEvents(entry.id);
      setEntryEvents(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEntryEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Check if an entry has back-to-back duplicate events (suspicious behavior)
  const hasBackToBackDuplicateEvents = (entryId: string): boolean => {
    const entryEvents = allEvents
      .filter(e => e.time_entry_id === entryId)
      .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());
    
    if (entryEvents.length < 2) return false;
    
    // Check for back-to-back duplicate event types that shouldn't happen
    const suspiciousEventTypes = ['paused', 'started', 'resumed'];
    
    for (let i = 1; i < entryEvents.length; i++) {
      const prevEvent = entryEvents[i - 1];
      const currEvent = entryEvents[i];
      
      // If two consecutive events are the same type and it's a suspicious type
      if (prevEvent.event_type === currEvent.event_type && 
          suspiciousEventTypes.includes(currEvent.event_type)) {
        return true;
      }
    }
    
    return false;
  };

  // Check for impossible pause durations (pause duration logged that doesn't match actual time)
  const hasImpossiblePauseDuration = (entryId: string): { found: boolean; details?: string } => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return { found: false };
    
    const entryEvents = allEvents
      .filter(e => e.time_entry_id === entryId)
      .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());
    
    const entryStart = new Date(entry.start_time);
    
    for (let i = 0; i < entryEvents.length; i++) {
      const event = entryEvents[i];
      
      // Check resumed events for impossible pause durations
      if (event.event_type === 'resumed' && event.details?.pauseDuration) {
        const pauseDurationMs = Number(event.details.pauseDuration);
        const eventTime = new Date(event.event_timestamp);
        const timeSinceStart = eventTime.getTime() - entryStart.getTime();
        
        // If pause duration is longer than time since start, it's impossible
        if (pauseDurationMs > timeSinceStart) {
          const pauseMinutes = Math.round(pauseDurationMs / 1000 / 60);
          const sinceStartMinutes = Math.round(timeSinceStart / 1000 / 60);
          return { 
            found: true, 
            details: `Pause of ${pauseMinutes}min logged, but only ${sinceStartMinutes}min since start` 
          };
        }
        
        // Also check: if resumed within 60 seconds of a start but pause duration > 1 hour
        // This indicates stale pause state from a previous session
        const startEvents = entryEvents.filter(e => e.event_type === 'started');
        if (startEvents.length > 0) {
          const lastStart = new Date(startEvents[startEvents.length - 1].event_timestamp);
          const timeSinceLastStart = eventTime.getTime() - lastStart.getTime();
          
          // If resumed within 60 seconds of start but pause duration > 1 hour
          if (timeSinceLastStart < 60000 && pauseDurationMs > 3600000) {
            const pauseMinutes = Math.round(pauseDurationMs / 1000 / 60);
            return { 
              found: true, 
              details: `Resumed ${Math.round(timeSinceLastStart/1000)}s after start, but logged ${pauseMinutes}min pause (stale state)` 
            };
          }
        }
      }
    }
    
    return { found: false };
  };

  // Check if stored duration might be wrong based on event calculations
  const hasDurationMismatch = (entryId: string): { found: boolean; storedDuration?: number; calculatedDuration?: number } => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !entry.end_time || entry.duration === null) return { found: false };
    
    const entryEvents = allEvents
      .filter(e => e.time_entry_id === entryId)
      .sort((a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime());
    
    // Only check entries with pause/resume events
    const hasRelevantEvents = entryEvents.some(e => 
      ['paused', 'resumed', 'auto_paused'].includes(e.event_type)
    );
    if (!hasRelevantEvents) return { found: false };
    
    // Calculate what duration should be based on events
    const startTime = new Date(entry.start_time);
    const endTime = new Date(entry.end_time);
    const totalElapsedMs = endTime.getTime() - startTime.getTime();
    
    let totalPausedMs = 0;
    let lastPauseTime: Date | null = null;
    
    for (const event of entryEvents) {
      if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
        lastPauseTime = new Date(event.event_timestamp);
      } else if (event.event_type === 'resumed' && lastPauseTime) {
        const resumeTime = new Date(event.event_timestamp);
        totalPausedMs += resumeTime.getTime() - lastPauseTime.getTime();
        lastPauseTime = null;
      }
    }
    
    // If ended while paused, add that duration
    if (lastPauseTime) {
      totalPausedMs += endTime.getTime() - lastPauseTime.getTime();
    }
    
    const calculatedDuration = Math.floor((totalElapsedMs - totalPausedMs) / (1000 * 60));
    const storedDuration = entry.duration;
    
    // If difference is more than 10% or more than 30 minutes, flag it
    const difference = Math.abs(storedDuration - calculatedDuration);
    const percentDiff = (difference / Math.max(storedDuration, calculatedDuration, 1)) * 100;
    
    if (difference > 30 || (percentDiff > 10 && difference > 5)) {
      return { found: true, storedDuration, calculatedDuration };
    }
    
    return { found: false };
  };

  // Get suspicion reasons for an entry
  const getSuspicionReasons = (entryId: string): string[] => {
    const reasons: string[] = [];
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return reasons;
    
    if (hasBackToBackDuplicateEvents(entryId)) {
      reasons.push('Duplicate consecutive events');
    }
    
    const impossiblePause = hasImpossiblePauseDuration(entryId);
    if (impossiblePause.found) {
      reasons.push(impossiblePause.details || 'Impossible pause duration');
    }
    
    const durationMismatch = hasDurationMismatch(entryId);
    if (durationMismatch.found) {
      reasons.push(`Duration mismatch: stored ${durationMismatch.storedDuration}min vs calculated ${durationMismatch.calculatedDuration}min`);
    }
    
    if (entry.end_time && (entry.duration === null || entry.duration === 0)) {
      reasons.push('Zero or null duration with end time');
    }
    
    if (!entry.end_time) {
      const hours = differenceInHours(new Date(), new Date(entry.start_time));
      if (hours > 12) {
        reasons.push(`Active for ${hours}+ hours`);
      }
    }
    
    if (entry.duration && entry.duration > 24 * 60) {
      reasons.push(`Very high duration: ${Math.round(entry.duration / 60)}h`);
    }
    
    return reasons;
  };

  // Mark entry as reviewed
  const markAsReviewed = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.name || 'Unknown'
        })
        .eq('id', entryId);
      
      if (error) throw error;
      
      // Update local state
      setEntries(prev => prev.map(e => 
        e.id === entryId 
          ? { ...e, reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.name || 'Unknown' }
          : e
      ));
    } catch (err) {
      console.error('Error marking as reviewed:', err);
    }
  };

  // Filter entries
  const activeTimers = entries.filter(e => !e.end_time);
  const suspiciousEntries = entries.filter(e => {
    // Exclude declined timers from suspicious activity
    if (e.status === 'declined') return false;
    
    // Check for back-to-back duplicate events (pause-pause, start-start, resume-resume)
    if (hasBackToBackDuplicateEvents(e.id)) return true;
    
    // Check for impossible pause durations (stale state issues)
    if (hasImpossiblePauseDuration(e.id).found) return true;
    
    // Check for duration mismatches between stored and calculated values
    if (hasDurationMismatch(e.id).found) return true;
    
    // Entries without duration but with end_time
    if (e.end_time && (e.duration === null || e.duration === 0)) return true;
    // Entries running for more than 12 hours
    if (!e.end_time) {
      const hours = differenceInHours(new Date(), new Date(e.start_time));
      if (hours > 12) return true;
    }
    // Entries with very high duration (>24 hours)
    if (e.duration && e.duration > 24 * 60) return true;
    return false;
  });
  
  // Separate unreviewed and reviewed suspicious entries
  const unreviewedSuspicious = suspiciousEntries.filter(e => !e.reviewed_at);
  const reviewedSuspicious = suspiciousEntries.filter(e => e.reviewed_at);

  const filteredEntries = entries.filter(entry => {
    // Tab filter
    if (activeTab === "active" && entry.end_time) return false;
    if (activeTab === "suspicious") {
      if (!suspiciousEntries.includes(entry)) return false;
      // Filter by reviewed status on suspicious tab
      if (!showReviewed && entry.reviewed_at) return false;
    }
    if (activeTab === "events" && getEventCount(entry.id) === 0) return false;

    // User filter
    if (userFilter !== "all" && entry.user_id !== userFilter) return false;

    // Status filter - don't apply to active timers (they should always show when on Active tab)
    if (statusFilter !== "all" && entry.status !== statusFilter && activeTab !== "active") return false;

    // Search filter
    if (searchTerm) {
      const userName = getUserName(entry.user_id).toLowerCase();
      const projectName = getProjectName(entry.project_id).toLowerCase();
      const taskName = getTaskName(entry.task_id).toLowerCase();
      const notes = (entry.notes || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      
      if (!userName.includes(search) && 
          !projectName.includes(search) && 
          !taskName.includes(search) &&
          !notes.includes(search)) {
        return false;
      }
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ["ID", "User", "Project", "Task", "Client", "Start Time", "End Time", "Duration (min)", "Status", "Notes", "Event Count"];
    const rows = filteredEntries.map(e => [
      e.id,
      getUserName(e.user_id),
      getProjectName(e.project_id),
      getTaskName(e.task_id),
      getClientName(e.client_id),
      e.start_time,
      e.end_time || "ACTIVE",
      e.duration?.toString() || "",
      e.status || "",
      (e.notes || "").replace(/,/g, ";"),
      getEventCount(e.id).toString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-audit-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  const getStatusBadge = (entry: RawTimeEntry) => {
    if (!entry.end_time) {
      const hours = differenceInHours(new Date(), new Date(entry.start_time));
      if (hours > 12) {
        return <Badge variant="destructive" className="animate-pulse">Active {hours}h+ ⚠️</Badge>;
      }
      return <Badge className="bg-green-500 animate-pulse">Active</Badge>;
    }
    
    if (entry.status === "approved") {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
    }
    if (entry.status === "declined") {
      return <Badge variant="destructive">Declined</Badge>;
    }
    return <Badge variant="secondary">{entry.status || "Pending"}</Badge>;
  };

  // Get unique users from entries
  const uniqueUserIds = [...new Set(entries.map(e => e.user_id))];
  
  // Count entries with events
  const entriesWithEvents = entries.filter(e => getEventCount(e.id) > 0).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time Entry Audit
                {isSuperAdmin && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 ml-2">
                    Admin View - All Users
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isSuperAdmin 
                  ? `Viewing all time entries across ${uniqueUserIds.length} users (Super Admin access)`
                  : 'View all raw time entry data with detailed event history'
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{entries.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
            <Card className={activeTimers.length > 0 ? "border-green-500/50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Timers</p>
                    <p className="text-2xl font-bold text-green-600">{activeTimers.length}</p>
                  </div>
                  <Play className="h-8 w-8 text-green-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card className={suspiciousEntries.length > 0 ? "border-amber-500/50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suspicious</p>
                    <p className="text-2xl font-bold text-amber-600">{suspiciousEntries.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">With Events</p>
                    <p className="text-2xl font-bold text-blue-600">{entriesWithEvents}</p>
                  </div>
                  <History className="h-8 w-8 text-blue-500/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold">{allEvents.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Entries ({entries.length})</TabsTrigger>
              <TabsTrigger value="active" className="text-green-600">
                Active ({activeTimers.length})
              </TabsTrigger>
              <TabsTrigger value="suspicious" className="text-amber-600">
                Suspicious ({unreviewedSuspicious.length}{reviewedSuspicious.length > 0 ? ` + ${reviewedSuspicious.length} reviewed` : ''})
              </TabsTrigger>
              <TabsTrigger value="events" className="text-blue-600">
                With Events ({entriesWithEvents})
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, project, task, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUserIds.map(userId => (
                    <SelectItem key={userId} value={userId}>
                      {getUserName(userId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all" className="mt-4">
              <TimeEntryTable 
                entries={filteredEntries} 
                {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge, getEventCount, openEventDetails }} 
              />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <TimeEntryTable 
                entries={filteredEntries} 
                {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge, getEventCount, openEventDetails }} 
              />
            </TabsContent>
            <TabsContent value="suspicious" className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={showReviewed ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowReviewed(!showReviewed)}
                >
                  {showReviewed ? 'Hide Reviewed' : `Show Reviewed (${reviewedSuspicious.length})`}
                </Button>
              </div>
              <TimeEntryTable 
                entries={filteredEntries} 
                {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge, getEventCount, openEventDetails }}
                showReviewButton={true}
                onMarkReviewed={markAsReviewed}
                getSuspicionReasons={getSuspicionReasons}
              />
            </TabsContent>
            <TabsContent value="events" className="mt-4">
              <TimeEntryTable 
                entries={filteredEntries} 
                {...{ getUserName, getProjectName, getTaskName, getClientName, formatDuration, calculateLiveDuration, getStatusBadge, getEventCount, openEventDetails }} 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Event History
            </DialogTitle>
            <DialogDescription>
              {selectedEntry && (
                <span>
                  Timer for {getTaskName(selectedEntry.task_id) !== '-' ? getTaskName(selectedEntry.task_id) : getProjectName(selectedEntry.project_id)}
                  {' • '}Started {format(new Date(selectedEntry.start_time), 'MMM d, yyyy HH:mm')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh]">
            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entryEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No events recorded for this time entry yet.</p>
                <p className="text-sm">Events will appear here when the timer is paused, resumed, or edited.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entryEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                    <div className="text-2xl">{getEventIcon(event.event_type as any)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatEventType(event.event_type as any)}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.event_timestamp), 'MMM d, HH:mm:ss')}
                        </span>
                      </div>
                      {event.details && (
                        <div className="mt-1 text-sm text-muted-foreground space-y-1">
                          {event.details.previousValue !== undefined && event.details.newValue !== undefined && (
                            <p>
                              Changed from <span className="font-mono bg-muted px-1 rounded">{String(event.details.previousValue)}</span>
                              {' → '}
                              <span className="font-mono bg-muted px-1 rounded">{String(event.details.newValue)}</span>
                            </p>
                          )}
                          {event.details.pauseDuration !== undefined && (
                            <p>Pause duration: <span className="font-medium">
                              {event.details.pauseDurationMinutes !== undefined 
                                ? event.details.pauseDurationMinutes 
                                : Math.round(event.details.pauseDuration / 1000 / 60)} minutes
                            </span></p>
                          )}
                          {event.details.reason && (
                            <p>Reason: {event.details.reason}</p>
                          )}
                          {event.details.field && (
                            <p>Field: <span className="font-mono">{event.details.field}</span></p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {selectedEntry && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Entry Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">User:</span>{' '}
                  <span className="font-medium">{getUserName(selectedEntry.user_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  {getStatusBadge(selectedEntry)}
                </div>
                <div>
                  <span className="text-muted-foreground">Stored Duration:</span>{' '}
                  <span className="font-medium">
                    {selectedEntry.end_time 
                      ? formatDuration(selectedEntry.duration)
                      : calculateLiveDuration(selectedEntry.start_time, selectedEntry.id) + ' (running)'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Project:</span>{' '}
                  <span className="font-medium">{getProjectName(selectedEntry.project_id)}</span>
                </div>
                {/* Show calculated duration from events */}
                {selectedEntry.end_time && entryEvents.length > 0 && (() => {
                  // Calculate actual active time from events
                  const startTime = new Date(selectedEntry.start_time);
                  const endTime = new Date(selectedEntry.end_time);
                  const totalElapsedMs = endTime.getTime() - startTime.getTime();
                  
                  let totalPausedMs = 0;
                  let lastPauseTime: Date | null = null;
                  
                  const sortedEvents = [...entryEvents].sort((a, b) => 
                    new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
                  );
                  
                  for (const event of sortedEvents) {
                    if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
                      lastPauseTime = new Date(event.event_timestamp);
                    } else if (event.event_type === 'resumed' && lastPauseTime) {
                      const resumeTime = new Date(event.event_timestamp);
                      totalPausedMs += resumeTime.getTime() - lastPauseTime.getTime();
                      lastPauseTime = null;
                    }
                  }
                  
                  // If ended while paused
                  if (lastPauseTime) {
                    totalPausedMs += endTime.getTime() - lastPauseTime.getTime();
                  }
                  
                  const calculatedMinutes = Math.floor((totalElapsedMs - totalPausedMs) / (1000 * 60));
                  const storedMinutes = selectedEntry.duration || 0;
                  const difference = Math.abs(storedMinutes - calculatedMinutes);
                  const hasMismatch = difference > 5;
                  
                  return (
                    <div className="col-span-2 mt-2 p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground">Calculated from Events:</span>{' '}
                          <span className={`font-bold ${hasMismatch ? 'text-amber-600' : 'text-green-600'}`}>
                            {formatDuration(calculatedMinutes)}
                          </span>
                        </div>
                        {hasMismatch && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                            ⚠️ Differs by {formatDuration(difference)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Total paused: {formatDuration(Math.floor(totalPausedMs / (1000 * 60)))} | 
                        Total elapsed: {formatDuration(Math.floor(totalElapsedMs / (1000 * 60)))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface TimeEntryTableProps {
  entries: RawTimeEntry[];
  getUserName: (id: string) => string;
  getProjectName: (id: string | null) => string;
  getTaskName: (id: string | null) => string;
  getClientName: (id: string | null) => string;
  formatDuration: (mins: number | null) => string;
  calculateLiveDuration: (startTime: string, entryId: string) => string;
  getStatusBadge: (entry: RawTimeEntry) => JSX.Element;
  getEventCount: (entryId: string) => number;
  openEventDetails: (entry: RawTimeEntry) => void;
  showReviewButton?: boolean;
  onMarkReviewed?: (entryId: string) => void;
  getSuspicionReasons?: (entryId: string) => string[];
}

const TimeEntryTable = ({ 
  entries, 
  getUserName, 
  getProjectName, 
  getTaskName, 
  getClientName,
  formatDuration,
  calculateLiveDuration,
  getStatusBadge,
  getEventCount,
  openEventDetails,
  showReviewButton = false,
  onMarkReviewed,
  getSuspicionReasons
}: TimeEntryTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No entries found matching your filters
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto max-h-[600px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead>User</TableHead>
            {getSuspicionReasons && <TableHead className="text-amber-600">⚠️ Issues</TableHead>}
            <TableHead>Client</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const eventCount = getEventCount(entry.id);
            const reasons = getSuspicionReasons ? getSuspicionReasons(entry.id) : [];
            return (
              <TableRow key={entry.id} className={!entry.end_time ? "bg-green-500/5" : ""}>
                <TableCell>{getStatusBadge(entry)}</TableCell>
                <TableCell className="font-medium">{getUserName(entry.user_id)}</TableCell>
                {getSuspicionReasons && (
                  <TableCell className="max-w-[250px]">
                    {reasons.length > 0 ? (
                      <div className="space-y-1">
                        {reasons.map((reason, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs block w-fit"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>{getClientName(entry.client_id)}</TableCell>
                <TableCell>{getProjectName(entry.project_id)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{getTaskName(entry.task_id)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(entry.start_time), 'MMM d, yyyy')}
                    <span className="text-muted-foreground ml-1">
                      {format(new Date(entry.start_time), 'HH:mm')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.end_time ? (
                    <div className="text-sm">
                      {format(new Date(entry.end_time), 'MMM d, yyyy')}
                      <span className="text-muted-foreground ml-1">
                        {format(new Date(entry.end_time), 'HH:mm')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-green-600 font-medium">Running...</span>
                  )}
                </TableCell>
                <TableCell>
                  {!entry.end_time ? (
                    <span className="text-green-600 font-medium">{calculateLiveDuration(entry.start_time, entry.id)}</span>
                  ) : (
                    formatDuration(entry.duration)
                  )}
                </TableCell>
                <TableCell>
                  {eventCount > 0 ? (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {eventCount} events
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
                  {entry.notes || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEventDetails(entry)}
                      className="h-8 w-8 p-0"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {showReviewButton && !entry.reviewed_at && onMarkReviewed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkReviewed(entry.id)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        title="Mark as reviewed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {showReviewButton && entry.reviewed_at && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                        Reviewed
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
