import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfDay } from "date-fns";
import { Play, Clock, Calendar, ChevronDown, ChevronRight, Plus, Pause, Save, Edit, Download, FileText, Building2, Timer, RefreshCw, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ActiveTimersSection } from "@/components/time/ActiveTimersSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar, FilterOption } from "@/components/common/FilterBar";
import { TimeEntry, TimeEntryStatus } from "@/types";
import { UserTimeTrackingReport } from "@/components/dashboard/cards/UserTimeTrackingReport";
import { ClientTimeReport } from "@/components/time/ClientTimeReport";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { EditTimeEntryDialog } from "@/components/time/EditTimeEntryDialog";
import { StartTimerDialog } from "@/components/time/StartTimerDialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateClientMonthlyReportCSV, generateClientDetailedReportCSV, downloadCSV } from "@/utils/exportUtils";

const TimeTracking = () => {
  const { timeEntries, users, tasks, projects, clients, startTimeTracking, activeTimeEntry, currentUser, updateTimeEntryStatus, stopTimeTracking, isTimerPaused, pauseTimeTracking, resumeTimeTracking, getElapsedTime, customRoles } = useAppContext();
  const [activeTab, setActiveTab] = useState("active");
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | undefined>(undefined);
  const [isEditEntryDialogOpen, setIsEditEntryDialogOpen] = useState(false);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopNotes, setStopNotes] = useState("");
  const [isStartTimerDialogOpen, setIsStartTimerDialogOpen] = useState(false);
  // Manual adjustments state for time entries
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, { total: number; count: number }>>({});
  
  // User report state
  const [selectedReportUserId, setSelectedReportUserId] = useState<string>(currentUser?.auth_user_id || "");

  // Update selected user when current user loads
  useEffect(() => {
    if (currentUser && !selectedReportUserId) {
      setSelectedReportUserId(currentUser.auth_user_id);
    }
  }, [currentUser, selectedReportUserId]);
  
  // Check if current user is admin using systemRoles (consolidated role system)
  const isAdminUser = () => {
    if (!currentUser) return false;
    return currentUser.systemRoles?.includes('platform_admin') || 
           currentUser.systemRoles?.includes('support_admin');
  };

  // isSuperAdmin is same as isAdminUser now (consolidated)
  const isSuperAdmin = isAdminUser();

  // All active timers state (for super admins)
  const [allActiveTimers, setAllActiveTimers] = useState<any[]>([]);
  const [loadingAllTimers, setLoadingAllTimers] = useState(false);

  // Fetch all active timers for super admins
  const fetchAllActiveTimers = async () => {
    if (!isSuperAdmin) return;
    
    setLoadingAllTimers(true);
    try {
      console.log('🔍 Fetching all active timers for super admin');
      
      // Fetch active timers and their events in parallel
      const [entriesResult, eventsResult] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .in('timer_status', ['active', 'paused'])
          .order('start_time', { ascending: false }),
        supabase
          .from('time_entry_events')
          .select('*')
          .order('event_timestamp', { ascending: true })
      ]);
      
      if (entriesResult.error) {
        console.error('Error fetching all active timers:', entriesResult.error);
        return;
      }
      
      const data = entriesResult.data || [];
      const allEvents = eventsResult.data || [];
      
      console.log('⏱️ Found', data.length, 'active timers across all users');
      
      // Helper function to calculate actual elapsed time accounting for pauses
      const calculateElapsedWithPauses = (entryId: string, startTime: Date): number => {
        const now = Date.now();
        const totalElapsedMs = now - startTime.getTime();
        
        // Get all pause/resume events for this entry
        const entryEvents = allEvents.filter(e => e.time_entry_id === entryId);
        let totalPausedMs = 0;
        let lastPauseTime: Date | null = null;
        
        for (const event of entryEvents) {
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
          totalPausedMs += now - lastPauseTime.getTime();
        }
        
        return Math.max(0, totalElapsedMs - totalPausedMs);
      };
      
      // Check if timer is currently paused by looking at last event
      const isTimerPaused = (entryId: string): boolean => {
        const entryEvents = allEvents.filter(e => e.time_entry_id === entryId);
        if (entryEvents.length === 0) return false;
        const lastEvent = entryEvents[entryEvents.length - 1];
        return lastEvent.event_type === 'paused';
      };
      
      // Convert to timer format with user info and correct elapsed time
      const timersWithInfo = data.map(entry => {
        const user = users.find(u => u.auth_user_id === entry.user_id || u.id === entry.user_id);
        const task = entry.task_id ? tasks.find(t => t.id === entry.task_id) : null;
        const project = entry.project_id ? projects.find(p => p.id === entry.project_id) : null;
        const client = project?.clientId ? clients.find(c => c.id === project.clientId) : null;
        
        const startTime = new Date(entry.start_time);
        const isPaused = isTimerPaused(entry.id);
        const actualElapsed = calculateElapsedWithPauses(entry.id, startTime);
        
        return {
          id: entry.id,
          taskId: entry.task_id || '',
          taskTitle: task?.title || 'Unknown Task',
          projectName: project?.name,
          clientName: client?.name,
          startTime: startTime,
          elapsed: actualElapsed,
          isPaused: isPaused,
          pausedAt: undefined,
          totalPausedTime: 0, // Already factored into elapsed calculation
          isActive: !isPaused,
          isLocalOnly: false,
          userId: entry.user_id,
          userName: user?.name || 'Unknown User',
          isOtherUser: entry.user_id !== currentUser?.auth_user_id,
          rawEntry: entry,
          // Pre-computed elapsed that accounts for pauses - for display
          cachedElapsed: actualElapsed
        };
      });
      
      setAllActiveTimers(timersWithInfo);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingAllTimers(false);
    }
  };

  // Fetch all active timers when component mounts and user is super admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllActiveTimers();
    }
  }, [isSuperAdmin, users, tasks, projects, clients]);

  // Filter state - default to current user's entries for non-admins
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );

  // Set default user filter when current user loads
  useEffect(() => {
    if (currentUser && !isAdminUser() && !selectedFilters.user?.length) {
      setSelectedFilters(prev => ({
        ...prev,
        user: [currentUser.id]
      }));
    }
  }, [currentUser]);
  
  // Date range filter for timesheet
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Local timers state
  const [localTimers, setLocalTimers] = useState<any[]>([]);


  // Load local timers from localStorage - only load LOCAL-ONLY timers (not backend timers)
  useEffect(() => {
    const loadLocalTimers = () => {
      const savedTimers = localStorage.getItem('activeTimers');
      if (savedTimers) {
        try {
          const parsed = JSON.parse(savedTimers);
          // Filter to only show current user's LOCAL-ONLY timers
          // Backend timers are synced from activeTimeEntry and should not persist across refresh
          const userLocalTimers = parsed.filter((t: any) => 
            (!t.userId || t.userId === currentUser?.id) && t.isLocalOnly === true
          );
          console.log('📂 TimeTracking: Loading local-only timers:', userLocalTimers.length);
          setLocalTimers(userLocalTimers.map((t: any) => ({
            ...t,
            startTime: new Date(t.startTime),
            pausedAt: t.pausedAt ? new Date(t.pausedAt) : undefined
          })));
        } catch (error) {
          console.error('Error loading local timers:', error);
        }
      }
    };

    // Load initially
    loadLocalTimers();

    // Listen for timer updates
    const handleTimersUpdate = () => loadLocalTimers();
    window.addEventListener('timersUpdated', handleTimersUpdate);
    
    return () => window.removeEventListener('timersUpdated', handleTimersUpdate);
  }, []);

  // Update current time every second for active timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);



  const filterOptions: FilterOption[] = [
    // Only show user filter for admins
    ...(isAdminUser() ? [{
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
    },
    {
      id: "status",
      name: "Status",
      options: [
        { id: "pending", label: "Pending" },
        { id: "approved", label: "Approved" },
        { id: "declined", label: "Declined" }
      ]
    }
  ];
  
  // Filter time entries based on selected filters and date range
  // Exclude active/unsaved timers (entries without endTime) - they belong in Active Timers section
  const filteredTimeEntries = timeEntries.filter(entry => {
    // Skip entries without endTime - these are active/unsaved timers
    if (!entry.endTime) {
      return false;
    }
    
    // Get task and project (but don't filter out if missing)
    const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
    const project = task ? projects.find(p => p.id === task.projectId) : 
                   (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
    
    // For non-admins, always filter to only their own entries
    if (!isAdminUser()) {
      if (entry.userId !== currentUser?.id) {
        return false;
      }
    } else {
      // Check user filter (only for admins)
      if (selectedFilters.user?.length > 0 && !selectedFilters.user.includes(entry.userId)) {
        return false;
      }
    }
    
    // Check project filter - only apply if we have projects and the filter is set
    if (selectedFilters.project?.length > 0) {
      const entryProjectId = task?.projectId || entry.projectId;
      if (!entryProjectId || !selectedFilters.project.includes(entryProjectId)) {
        return false;
      }
    }
    
    // Check client filter - try multiple ways to get client ID
    if (selectedFilters.client?.length > 0) {
      const entryClientId = project?.clientId || entry.clientId;
      if (!entryClientId || !selectedFilters.client.includes(entryClientId)) {
        return false;
      }
    }
    
    // Check status filter
    if (selectedFilters.status?.length > 0) {
      const entryStatus = entry.status || 'pending';
      // Map approved-billable and approved-non-billable to "approved"
      const normalizedStatus = entryStatus.startsWith('approved') ? 'approved' : entryStatus;
      if (!selectedFilters.status.includes(normalizedStatus)) {
        return false;
      }
    }
    
    // Check date range
    if (dateRange.from || dateRange.to) {
      const entryDate = new Date(entry.startTime);
      
      if (dateRange.from && dateRange.to) {
        // Use startOfDay for from and endOfDay for to to include the entire day
        const inRange = isWithinInterval(entryDate, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        });
        if (!inRange) {
          return false;
        }
      } else if (dateRange.from) {
        if (entryDate < startOfDay(dateRange.from)) {
          return false;
        }
      } else if (dateRange.to) {
        if (entryDate > endOfDay(dateRange.to)) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Fetch manual adjustments for filtered time entries
  useEffect(() => {
    const fetchManualAdjustments = async () => {
      if (filteredTimeEntries.length === 0) {
        setManualAdjustments({});
        return;
      }
      
      const entryIds = filteredTimeEntries.map(e => e.id);
      
      const { data: events, error } = await supabase
        .from('time_entry_events')
        .select('*')
        .in('time_entry_id', entryIds)
        .eq('event_type', 'manual_edit')
        .order('event_timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching manual adjustments:', error);
        return;
      }
      
      const adjustmentsMap: Record<string, { total: number; count: number }> = {};
      
      for (const event of events || []) {
        const entryId = event.time_entry_id;
        if (!adjustmentsMap[entryId]) {
          adjustmentsMap[entryId] = { total: 0, count: 0 };
        }
        
        const details = event.details as { 
          previousValue?: { duration?: number }; 
          newValue?: { duration?: number };
          old_duration?: number; 
          new_duration?: number;
        } | null;
        
        // Handle both formats: nested (previousValue/newValue) and flat (old_duration/new_duration)
        const oldDuration = details?.previousValue?.duration ?? details?.old_duration;
        const newDuration = details?.newValue?.duration ?? details?.new_duration;
        
        if (oldDuration !== undefined && newDuration !== undefined) {
          const diff = newDuration - oldDuration;
          adjustmentsMap[entryId].total += diff;
          adjustmentsMap[entryId].count += 1;
        }
      }
      
      setManualAdjustments(adjustmentsMap);
    };
    
    fetchManualAdjustments();
  }, [filteredTimeEntries]);

  
  const dates = [...new Set(filteredTimeEntries.map(entry => 
    format(new Date(entry.startTime), "yyyy-MM-dd")
  ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Group filtered time entries by date
  const entriesByDate = dates.reduce((acc, date) => {
    acc[date] = filteredTimeEntries.filter(entry => 
      format(new Date(entry.startTime), "yyyy-MM-dd") === date
    );
    return acc;
  }, {} as Record<string, typeof filteredTimeEntries>);

  // Get active timer with shared elapsed time calculation
  const getActiveTimer = () => {
    if (!activeTimeEntry) {
      return null;
    }
    
    const task = tasks.find(t => t.id === activeTimeEntry.taskId);
    const project = task ? projects.find(p => p.id === task.projectId) : undefined;
    const client = project ? clients.find(c => c.id === project.clientId) : undefined;
    const user = users.find(u => u.id === activeTimeEntry.userId);
    
    return {
      task,
      project,
      client,
      user,
      timeEntry: activeTimeEntry,
      elapsedTime: getElapsedTime(activeTimeEntry)
    };
  };
  
  // Get total duration for a given day
  const getTotalDuration = (entries: typeof timeEntries) => {
    return entries.reduce((total, entry) => total + entry.duration, 0);
  };
  
  // Active timer for the Active tab
  const activeTimer = getActiveTimer();

  // Use the isAdminUser function defined earlier
  const isAdmin = isAdminUser;
  
  // Generate monthly report data grouped by client - only approved timers
  const getMonthlyDataByClient = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get entries for the selected month - only approved timers
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const isInMonth = entryDate >= startDate && entryDate <= endDate;
      const isApproved = entry.status === 'approved-billable' || entry.status === 'approved-non-billable';
      
      // For non-admins, always filter to only their own entries
      if (!isAdmin()) {
        if (entry.userId !== currentUser?.id) {
          return false;
        }
      }
      
      if (!isInMonth || !isApproved) return false;
      
      // Check user filter (admin only)
      if (selectedFilters.user?.length > 0) {
        if (!selectedFilters.user.includes(entry.userId)) {
          return false;
        }
      }
      
      // Apply selected filters
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      // Check client filter
      if (selectedFilters.client?.length > 0) {
        const clientId = client?.id || entry.clientId;
        if (!clientId || !selectedFilters.client.includes(clientId)) {
          return false;
        }
      }
      
      // Check project filter
      if (selectedFilters.project?.length > 0) {
        const projectId = project?.id || entry.projectId;
        if (!projectId || !selectedFilters.project.includes(projectId)) {
          return false;
        }
      }
      
      // Check status filter - if "approved" is selected, this is already an approved entry
      // If another status is selected but not approved, this entry should be excluded
      if (selectedFilters.status?.length > 0) {
        if (!selectedFilters.status.includes('approved')) {
          return false;
        }
      }
      
      return true;
    });
    
    // Group entries by client first
    const entriesByClient: Record<string, { 
      client: typeof clients[0] | { id: string, name: string },
      totalMinutes: number,
      projectDetails: Record<string, {
        project: typeof projects[0] | { id: string, name: string },
        totalMinutes: number,
        taskDetails: Record<string, {
          task: typeof tasks[0] | { id: string, title: string },
          totalMinutes: number,
          entries: typeof timeEntries
        }>
      }>
    }> = {};
    
    // Process all entries
    monthEntries.forEach(entry => {
      // Try to get task, project, and client, but use fallbacks if not found
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      // Use fallbacks for missing data
      const finalTask = task || { id: 'manual-' + entry.id, title: 'Manual Time Entry' };
      const finalProject = project || { id: 'no-project-' + entry.id, name: 'No Project' };
      const finalClient = client || { id: 'no-client-' + entry.id, name: 'No Client' };
      
      // Initialize client entry if needed
      if (!entriesByClient[finalClient.id]) {
        entriesByClient[finalClient.id] = { 
          client: finalClient, 
          totalMinutes: 0,
          projectDetails: {}
        };
      }
      
      // Add to client total
      entriesByClient[finalClient.id].totalMinutes += entry.duration;
      
      // Initialize project entry if needed
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id] = {
          project: finalProject,
          totalMinutes: 0,
          taskDetails: {}
        };
      }
      
      // Add to project total
      entriesByClient[finalClient.id].projectDetails[finalProject.id].totalMinutes += entry.duration;
      
      // Initialize task entry if needed
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id] = {
          task: finalTask,
          totalMinutes: 0,
          entries: []
        };
      }
      
      // Add to task total and entries
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].totalMinutes += entry.duration;
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].entries.push(entry);
    });
    
    return Object.values(entriesByClient).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  // Generate monthly report data grouped by user (admin only)
  const getMonthlyDataByUser = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get entries for the selected month - only approved timers
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const isInMonth = entryDate >= startDate && entryDate <= endDate;
      const isApproved = entry.status === 'approved-billable' || entry.status === 'approved-non-billable';
      return isInMonth && isApproved;
    });
    
    // Group entries by user first
    const entriesByUser: Record<string, {
      user: typeof users[0] | { id: string, name: string },
      totalMinutes: number,
      clientDetails: Record<string, {
        client: typeof clients[0] | { id: string, name: string },
        totalMinutes: number,
        projectDetails: Record<string, {
          project: typeof projects[0] | { id: string, name: string },
          totalMinutes: number
        }>
      }>
    }> = {};
    
    // Process all entries
    monthEntries.forEach(entry => {
      const user = users.find(u => u.auth_user_id === entry.userId);
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      const finalUser = user || { id: entry.userId, name: 'Unknown User' };
      const finalProject = project || { id: 'no-project-' + entry.id, name: 'No Project' };
      const finalClient = client || { id: 'no-client-' + entry.id, name: 'No Client' };
      
      // Initialize user entry if needed
      if (!entriesByUser[finalUser.id]) {
        entriesByUser[finalUser.id] = {
          user: finalUser,
          totalMinutes: 0,
          clientDetails: {}
        };
      }
      
      entriesByUser[finalUser.id].totalMinutes += entry.duration;
      
      // Initialize client entry if needed
      if (!entriesByUser[finalUser.id].clientDetails[finalClient.id]) {
        entriesByUser[finalUser.id].clientDetails[finalClient.id] = {
          client: finalClient,
          totalMinutes: 0,
          projectDetails: {}
        };
      }
      
      entriesByUser[finalUser.id].clientDetails[finalClient.id].totalMinutes += entry.duration;
      
      // Initialize project entry if needed
      if (!entriesByUser[finalUser.id].clientDetails[finalClient.id].projectDetails[finalProject.id]) {
        entriesByUser[finalUser.id].clientDetails[finalClient.id].projectDetails[finalProject.id] = {
          project: finalProject,
          totalMinutes: 0
        };
      }
      
      entriesByUser[finalUser.id].clientDetails[finalClient.id].projectDetails[finalProject.id].totalMinutes += entry.duration;
    });
    
    return Object.values(entriesByUser).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };
  
  // Generate monthly report data for declined entries
  const getMonthlyDeclinedDataByClient = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    // Get declined entries for the selected month
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const isInMonth = entryDate >= startDate && entryDate <= endDate;
      const isDeclined = entry.status === 'declined';
      
      // For non-admins, always filter to only their own entries
      if (!isAdmin()) {
        if (entry.userId !== currentUser?.id) {
          return false;
        }
      }
      
      if (!isInMonth || !isDeclined) return false;
      
      // Check user filter (admin only)
      if (selectedFilters.user?.length > 0) {
        if (!selectedFilters.user.includes(entry.userId)) {
          return false;
        }
      }
      
      // Apply selected filters
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      if (selectedFilters.client?.length > 0) {
        const clientId = client?.id || entry.clientId;
        if (!clientId || !selectedFilters.client.includes(clientId)) return false;
      }
      
      if (selectedFilters.project?.length > 0) {
        const projectId = project?.id || entry.projectId;
        if (!projectId || !selectedFilters.project.includes(projectId)) return false;
      }
      
      // Check status filter - if "declined" is selected, this is already a declined entry
      // If another status is selected but not declined, this entry should be excluded
      if (selectedFilters.status?.length > 0) {
        if (!selectedFilters.status.includes('declined')) {
          return false;
        }
      }
      
      return true;
    });
    
    // Group entries by client first (same structure as approved)
    const entriesByClient: Record<string, { 
      client: typeof clients[0] | { id: string, name: string },
      totalMinutes: number,
      projectDetails: Record<string, {
        project: typeof projects[0] | { id: string, name: string },
        totalMinutes: number,
        taskDetails: Record<string, {
          task: typeof tasks[0] | { id: string, title: string },
          totalMinutes: number,
          entries: typeof timeEntries
        }>
      }>
    }> = {};
    
    // Process all entries
    monthEntries.forEach(entry => {
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      const finalTask = task || { id: 'manual-' + entry.id, title: 'Manual Time Entry' };
      const finalProject = project || { id: 'no-project-' + entry.id, name: 'No Project' };
      const finalClient = client || { id: 'no-client-' + entry.id, name: 'No Client' };
      
      if (!entriesByClient[finalClient.id]) {
        entriesByClient[finalClient.id] = { 
          client: finalClient, 
          totalMinutes: 0,
          projectDetails: {}
        };
      }
      
      entriesByClient[finalClient.id].totalMinutes += entry.duration;
      
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id] = {
          project: finalProject,
          totalMinutes: 0,
          taskDetails: {}
        };
      }
      
      entriesByClient[finalClient.id].projectDetails[finalProject.id].totalMinutes += entry.duration;
      
      if (!entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id]) {
        entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id] = {
          task: finalTask,
          totalMinutes: 0,
          entries: []
        };
      }
      
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].totalMinutes += entry.duration;
      entriesByClient[finalClient.id].projectDetails[finalProject.id].taskDetails[finalTask.id].entries.push(entry);
    });
    
    return Object.values(entriesByClient).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const monthlyDataByClient = getMonthlyDataByClient();
  const monthlyDataByUser = getMonthlyDataByUser();
  const monthlyDeclinedDataByClient = getMonthlyDeclinedDataByClient();

  // Calculate monthly totals for summary cards
  const getMonthlyTotals = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    let total = 0;
    let approvedBillable = 0;
    let approvedNonBillable = 0;
    let declined = 0;

    timeEntries.forEach(entry => {
      const entryDate = new Date(entry.startTime);
      if (entryDate < startDate || entryDate > endDate) return;
      
      // For non-admins, filter to only their own entries
      if (!isAdmin() && entry.userId !== currentUser?.id) return;

      // Check user filter (admin only)
      if (selectedFilters.user?.length > 0) {
        if (!selectedFilters.user.includes(entry.userId)) return;
      }

      // Apply selected filters
      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
      const project = task ? projects.find(p => p.id === task.projectId) : 
                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
      const client = project ? clients.find(c => c.id === project.clientId) : 
                    (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
      
      if (selectedFilters.client?.length > 0) {
        const clientId = client?.id || entry.clientId;
        if (!clientId || !selectedFilters.client.includes(clientId)) return;
      }
      
      if (selectedFilters.project?.length > 0) {
        const projectId = project?.id || entry.projectId;
        if (!projectId || !selectedFilters.project.includes(projectId)) return;
      }

      // Check status filter
      if (selectedFilters.status?.length > 0) {
        const entryStatus = entry.status || 'pending';
        const normalizedStatus = entryStatus.startsWith('approved') ? 'approved' : entryStatus;
        if (!selectedFilters.status.includes(normalizedStatus)) return;
      }

      total += entry.duration;
      const status = entry.status || 'pending';
      if (status === 'approved-billable') {
        approvedBillable += entry.duration;
      } else if (status === 'approved-non-billable') {
        approvedNonBillable += entry.duration;
      } else if (status === 'declined') {
        declined += entry.duration;
      }
    });

    return { total, approvedBillable, approvedNonBillable, declined };
  };

  const monthlyTotals = getMonthlyTotals();
  
  // Get available months for the selector
  const getAvailableMonths = () => {
    const months = new Set<string>();
    timeEntries.forEach(entry => {
      const date = new Date(entry.startTime);
      months.add(format(date, "yyyy-MM"));
    });
    return Array.from(months).sort().reverse();
  };
  
  const availableMonths = getAvailableMonths();
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Checks if current user can edit a time entry
  const canEditTimeEntry = (entry: TimeEntry) => {
    // Users can edit their own entries
    if (entry.userId === currentUser?.id) return true;
    
    // Admins can edit any entry
    if (currentUser && customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin') return true;
    
    return false;
  };

  // Checks if current user can approve/decline a time entry
  // Super admins (platform_admin, support_admin) can always change time entry status
  const canApproveTimeEntry = () => {
    if (!currentUser) return false;
    
    const roleIdLower = currentUser.roleId?.toLowerCase()?.trim();
    
    // Check for direct admin role (case-insensitive)
    if (roleIdLower === 'admin') return true;
    
    // Check for system roles (platform_admin, support_admin)
    const systemRoles = currentUser.systemRoles || [];
    if (systemRoles.includes('platform_admin') || systemRoles.includes('support_admin')) {
      console.log('✅ User has system admin role:', systemRoles);
      return true;
    }
    
    // Check for custom role with Admin name
    const userRole = customRoles.find(r => r.id === currentUser.roleId);
    return userRole?.name?.toLowerCase() === 'admin';
  };
  
  const handleEditTimeEntry = (entry: TimeEntry) => {
    setSelectedTimeEntry(entry);
    setIsEditEntryDialogOpen(true);
  };
  
  const handleAddNewEntry = () => {
    setSelectedTimeEntry(undefined);
    setIsAddEntryDialogOpen(true);
  };
  
  const handleApproveTimeEntry = (entry: TimeEntry, billable: boolean = true) => {
    if (!currentUser) return;
    
    const status = billable ? 'approved-billable' : 'approved-non-billable';
    updateTimeEntryStatus(entry.id, status);
    toast({
      title: "Time entry approved",
      description: `Marked as ${billable ? 'billable' : 'non-billable'}`,
    });
  };
  
  const handleDeclineTimeEntry = (entry: TimeEntry) => {
    updateTimeEntryStatus(entry.id, 'declined');
    toast({
      title: "Time entry declined",
      variant: "destructive",
    });
  };

  // Export handlers
  const handleExportSummary = () => {
    const monthlyData = getMonthlyDataByClient();
    const dataByClient = monthlyData.reduce((acc, item) => {
      acc[item.client.id] = item;
      return acc;
    }, {} as Record<string, typeof monthlyData[0]>);
    
    const csv = generateClientMonthlyReportCSV(dataByClient, selectedMonth, users);
    const filename = `time-report-summary-${selectedMonth}.csv`;
    downloadCSV(csv, filename);
    
    toast({
      title: "Report exported",
      description: `Summary report for ${format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')} downloaded`,
    });
  };

  const handleExportDetailed = () => {
    const monthlyData = getMonthlyDataByClient();
    const dataByClient = monthlyData.reduce((acc, item) => {
      acc[item.client.id] = item;
      return acc;
    }, {} as Record<string, typeof monthlyData[0]>);
    
    const csv = generateClientDetailedReportCSV(dataByClient, selectedMonth, undefined, users);
    const filename = `time-report-detailed-${selectedMonth}.csv`;
    downloadCSV(csv, filename);
    
    toast({
      title: "Report exported",
      description: `Detailed report for ${format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')} downloaded`,
    });
  };

  const handleExportByClient = (clientId: string, clientName: string) => {
    const monthlyData = getMonthlyDataByClient();
    const dataByClient = monthlyData.reduce((acc, item) => {
      acc[item.client.id] = item;
      return acc;
    }, {} as Record<string, typeof monthlyData[0]>);
    
    const csv = generateClientDetailedReportCSV(dataByClient, selectedMonth, clientId, users);
    const filename = `time-report-${clientName.replace(/\s+/g, '-')}-${selectedMonth}.csv`;
    downloadCSV(csv, filename);
    
    toast({
      title: "Client report exported",
      description: `Report for ${clientName} downloaded`,
    });
  };

  // Timer control handlers using AppContext
  const handlePauseTimer = async () => {
    console.log('🔸 TimeTracking: Pause/Resume clicked');
    if (isTimerPaused) {
      await resumeTimeTracking();
      console.log('▶️ Timer resumed');
    } else {
      pauseTimeTracking();
      console.log('⏸️ Timer paused');
    }
  };

  const handleStopTimer = () => {
    console.log('🛑 TimeTracking: Stop timer clicked');
    setStopDialogOpen(true);
  };

  const confirmStopTimer = async () => {
    try {
      console.log('💾 TimeTracking: Confirming stop timer with notes:', stopNotes);
      await stopTimeTracking(stopNotes);
      setStopDialogOpen(false);
      setStopNotes("");
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };
  
  // Status display helper
  const renderTimeEntryStatus = (status: TimeEntryStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            Pending
          </span>
        );
      case 'approved-billable':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
            Approved (Billable)
          </span>
        );
      case 'approved-non-billable':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            Approved (Non-billable)
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
            Declined
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Time Tracking</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track time spent on tasks and projects
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => {
            console.log('🟢 START TIMER BUTTON CLICKED');
            setIsStartTimerDialogOpen(true);
          }}>
            <Play className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Start Timer</span>
            <span className="sm:hidden">Start</span>
          </Button>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => {
            console.log('🟢 ADD MANUAL ENTRY BUTTON CLICKED');
            handleAddNewEntry();
          }}>
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add Manual Entry</span>
            <span className="sm:hidden">Add Entry</span>
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 w-full sm:w-auto">
          <TabsTrigger value="active" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Active Timers</span>
            <span className="sm:hidden">Active</span>
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Time Logs</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="client-report" className="text-xs sm:text-sm">
            <Building2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">By Client</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Monthly Summary</span>
            <span className="sm:hidden">Summary</span>
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="user-reports" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">User Reports</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    Active Timers
                    {isSuperAdmin && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 ml-2">
                        Admin View - All Users
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {isSuperAdmin 
                      ? `Viewing all active timers across all users (${allActiveTimers.length} active)`
                      : 'All unsaved timers (running and paused)'
                    }
                  </p>
                </div>
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={fetchAllActiveTimers} disabled={loadingAllTimers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingAllTimers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ActiveTimersSection 
                activeTimer={activeTimer}
                localTimers={localTimers}
                isTimerPaused={isTimerPaused}
                onPauseTimer={handlePauseTimer}
                onStopTimer={handleStopTimer}
                onEditTimer={(timeEntry) => {
                  setSelectedTimeEntry(timeEntry);
                  setIsEditEntryDialogOpen(true);
                }}
                allActiveTimers={isSuperAdmin ? allActiveTimers : []}
                isSuperAdmin={isSuperAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timesheet" className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <FilterBar 
                filters={filterOptions} 
                onFilterChange={setSelectedFilters} 
              />
              
              <div className="flex-shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({
                            from: range.from,
                            to: range.to || range.from
                          });
                        }
                      }}
                      numberOfMonths={2}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {dates.length > 0 ? (
            dates.map(date => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle>{format(new Date(date), "EEEE, MMMM d, yyyy")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entriesByDate[date].map(entry => {
                      const task = entry.taskId ? tasks.find(t => t.id === entry.taskId) : null;
                      const project = task ? projects.find(p => p.id === task.projectId) : 
                                     (entry.projectId ? projects.find(p => p.id === entry.projectId) : null);
                      const client = project ? clients.find(c => c.id === project.clientId) : 
                                   (entry.clientId ? clients.find(c => c.id === entry.clientId) : null);
                      const user = users.find(u => u.id === entry.userId);
                      
                      return (
                        <div 
                          key={entry.id} 
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-md",
                            entry.manuallyAdded || entry.edited ? "bg-yellow-50/50 dark:bg-yellow-900/10" : "bg-muted/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>{user?.name.slice(0, 2) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{task?.title || "Manual Time Entry"}</p>
                              <div className="flex flex-col text-xs text-muted-foreground">
                                <span>{project?.name || "No project"}</span>
                                <span>{client?.name || "No client"}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col text-sm md:text-center">
                            <p>{entry.notes || "No description"}</p>
                            <div className="mt-2">
                              {renderTimeEntryStatus(entry.status || 'pending')}
                              {(entry.manuallyAdded || entry.edited) && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                  {entry.manuallyAdded ? "Manual entry" : ""}
                                  {entry.manuallyAdded && entry.edited ? ", " : ""}
                                  {entry.edited ? "Edited" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">
                                {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                              </span>
                              {/* Show manual adjustment indicator */}
                              {manualAdjustments[entry.id] && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={cn(
                                        "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                                        manualAdjustments[entry.id].total >= 0 
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      )}>
                                        <Pencil className="h-3 w-3" />
                                        {manualAdjustments[entry.id].total >= 0 ? '+' : ''}
                                        {Math.floor(Math.abs(manualAdjustments[entry.id].total) / 60) > 0 && 
                                          `${Math.floor(Math.abs(manualAdjustments[entry.id].total) / 60)}h `}
                                        {Math.abs(manualAdjustments[entry.id].total) % 60}m
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Manually edited ({manualAdjustments[entry.id].count} edit{manualAdjustments[entry.id].count > 1 ? 's' : ''})</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-xs">
                                {format(new Date(entry.startTime), "HH:mm")} - 
                                {entry.endTime ? format(new Date(entry.endTime), " HH:mm") : " now"}
                              </div>
                              
                              {/* Always show dropdown if user can edit OR approve */}
                              {(canEditTimeEntry(entry) || canApproveTimeEntry()) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-background border border-border hover:bg-accent"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent 
                                    align="end" 
                                    className="w-56 bg-background border border-border shadow-lg z-50"
                                  >
                                    {canEditTimeEntry(entry) && (
                                      <DropdownMenuItem onClick={() => handleEditTimeEntry(entry)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Time Entry
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {canApproveTimeEntry() && entry.status === 'pending' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-green-600 dark:text-green-400 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-900/20"
                                          onClick={() => handleApproveTimeEntry(entry, true)}
                                        >
                                          ✓ Approve (Billable)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-blue-600 dark:text-blue-400 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-900/20"
                                          onClick={() => handleApproveTimeEntry(entry, false)}
                                        >
                                          ✓ Approve (Non-billable)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                          onClick={() => handleDeclineTimeEntry(entry)}
                                        >
                                          ✗ Decline
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    
                                    {canApproveTimeEntry() && entry.status !== 'pending' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                          Current: {entry.status === 'approved-billable' ? 'Approved (Billable)' : 
                                                  entry.status === 'approved-non-billable' ? 'Approved (Non-billable)' : 
                                                  entry.status === 'declined' ? 'Declined' : entry.status}
                                        </div>
                                        <DropdownMenuSeparator />
                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Change Status:</div>
                                        <DropdownMenuItem 
                                          className="text-yellow-600 dark:text-yellow-400"
                                          onClick={() => updateTimeEntryStatus(entry.id, 'pending')}
                                        >
                                          ↩ Set to Pending
                                        </DropdownMenuItem>
                                        {entry.status !== 'approved-billable' && (
                                          <DropdownMenuItem 
                                            className="text-green-600 dark:text-green-400"
                                            onClick={() => handleApproveTimeEntry(entry, true)}
                                          >
                                            ✓ Approve (Billable)
                                          </DropdownMenuItem>
                                        )}
                                        {entry.status !== 'approved-non-billable' && (
                                          <DropdownMenuItem 
                                            className="text-blue-600 dark:text-blue-400"
                                            onClick={() => handleApproveTimeEntry(entry, false)}
                                          >
                                            ✓ Approve (Non-billable)
                                          </DropdownMenuItem>
                                        )}
                                        {entry.status !== 'declined' && (
                                          <DropdownMenuItem 
                                            className="text-red-600 dark:text-red-400"
                                            onClick={() => handleDeclineTimeEntry(entry)}
                                          >
                                            ✗ Decline
                                          </DropdownMenuItem>
                                        )}
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Total:</span>
                      <span className="font-mono font-medium">
                        {Math.floor(getTotalDuration(entriesByDate[date]) / 60)}h {getTotalDuration(entriesByDate[date]) % 60}m
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <div className="space-y-2">
                  <p className="text-lg">No time entries found</p>
                  <p className="text-sm">
                    {timeEntries.length === 0 
                      ? "You haven't created any time entries yet. Start a timer from a task to create your first entry!"
                      : "No time entries match the selected filters. Try adjusting your filters or date range."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="client-report" className="space-y-6">
          <ClientTimeReport />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          {/* Filter Bar for Monthly Summary */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <FilterBar 
              filters={filterOptions} 
              onFilterChange={setSelectedFilters} 
            />
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Time</p>
                    <p className="text-2xl font-bold">{formatDuration(monthlyTotals.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Billable</p>
                    <p className="text-2xl font-bold">{formatDuration(monthlyTotals.approvedBillable)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Non-Billable</p>
                    <p className="text-2xl font-bold">{formatDuration(monthlyTotals.approvedNonBillable)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Declined</p>
                    <p className="text-2xl font-bold">{formatDuration(monthlyTotals.declined)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-2">
                <CardTitle>Monthly Summary</CardTitle>
                <p className="text-sm text-muted-foreground">Breakdown of approved and declined time entries</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month}>
                        {format(new Date(`${month}-01`), "MMMM yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportSummary}>
                      <FileText className="h-4 w-4 mr-2" />
                      Summary Report (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportDetailed}>
                      <Download className="h-4 w-4 mr-2" />
                      Detailed Report (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyDataByClient.length > 0 ? (
                <div className="space-y-4">
                  {monthlyDataByClient.map(clientData => (
                    <Accordion 
                      type="single" 
                      collapsible 
                      className="border rounded-lg p-2 bg-muted/10"
                      key={clientData.client.id}
                    >
                      <AccordionItem value={clientData.client.id} className="border-none">
                        <AccordionTrigger className="py-3 px-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                {clientData.client.name.charAt(0)}
                              </div>
                              <div className="font-medium">{clientData.client.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-mono font-medium">{formatDuration(clientData.totalMinutes)}</div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportByClient(clientData.client.id, clientData.client.name);
                                }}
                                className="h-7 text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-10">
                            {Object.values(clientData.projectDetails).map(projectData => (
                              <Collapsible key={projectData.project.id} className="border-l-2 pl-4 py-1">
                                <div className="flex items-center justify-between">
                                  <CollapsibleTrigger className="flex items-center gap-1 hover:underline">
                                    <ChevronRight className="h-4 w-4" />
                                    <span>{projectData.project.name}</span>
                                  </CollapsibleTrigger>
                                  <span className="font-mono text-sm">{formatDuration(projectData.totalMinutes)}</span>
                                </div>
                                <CollapsibleContent>
                                  <div className="mt-2 pl-6 space-y-1">
                                    {Object.values(projectData.taskDetails).map(taskData => (
                                      <div key={taskData.task.id} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{taskData.task.title}</span>
                                        <span className="font-mono">{formatDuration(taskData.totalMinutes)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No time entries for this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Declined Time Entries Section */}
          {monthlyDeclinedDataByClient.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Declined Time Entries</CardTitle>
                <p className="text-sm text-muted-foreground">Time entries that were declined and not billable</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyDeclinedDataByClient.map(clientData => (
                    <Accordion 
                      type="single" 
                      collapsible 
                      className="border border-red-200 dark:border-red-800 rounded-lg p-2 bg-red-50/50 dark:bg-red-900/10"
                      key={clientData.client.id}
                    >
                      <AccordionItem value={clientData.client.id} className="border-none">
                        <AccordionTrigger className="py-3 px-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 font-medium">
                                {clientData.client.name.charAt(0)}
                              </div>
                              <div className="font-medium">{clientData.client.name}</div>
                            </div>
                            <div className="font-mono font-medium text-red-600 dark:text-red-400">{formatDuration(clientData.totalMinutes)}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-10">
                            {Object.values(clientData.projectDetails).map(projectData => (
                              <Collapsible key={projectData.project.id} className="border-l-2 border-red-300 dark:border-red-700 pl-4 py-1">
                                <div className="flex items-center justify-between">
                                  <CollapsibleTrigger className="flex items-center gap-1 hover:underline">
                                    <ChevronRight className="h-4 w-4" />
                                    <span>{projectData.project.name}</span>
                                  </CollapsibleTrigger>
                                  <span className="font-mono text-sm">{formatDuration(projectData.totalMinutes)}</span>
                                </div>
                                <CollapsibleContent>
                                  <div className="mt-2 pl-6 space-y-1">
                                    {Object.values(projectData.taskDetails).map(taskData => (
                                      <div key={taskData.task.id} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{taskData.task.title}</span>
                                        <span className="font-mono">{formatDuration(taskData.totalMinutes)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* User Reports Tab - Admin only */}
        {isAdmin() && (
          <TabsContent value="user-reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Time Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View detailed time tracking report for any user
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Select User</label>
                  <Select
                    value={selectedReportUserId}
                    onValueChange={setSelectedReportUserId}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.auth_user_id} value={user.auth_user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback className="text-xs">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {selectedReportUserId && (
              <UserTimeTrackingReport userId={selectedReportUserId} />
            )}
          </TabsContent>
        )}
      </Tabs>
      
      {/* Add Time Entry Dialog */}
      <EditTimeEntryDialog
        isOpen={isAddEntryDialogOpen}
        onClose={() => setIsAddEntryDialogOpen(false)}
        isNewEntry={true}
      />
      
      {/* Edit Time Entry Dialog */}
      <EditTimeEntryDialog
        timeEntry={selectedTimeEntry}
        isOpen={isEditEntryDialogOpen}
        onClose={() => setIsEditEntryDialogOpen(false)}
      />
      
      {/* Stop Timer Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {activeTimer && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Task</p>
                  <p>{activeTimer.task?.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Time Elapsed</p>
                  <p className="font-mono text-lg">{activeTimer.elapsedTime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <Textarea 
                    placeholder="What did you work on?" 
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStopTimer}>Save Time Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Start Timer Dialog */}
      <StartTimerDialog
        open={isStartTimerDialogOpen}
        onOpenChange={setIsStartTimerDialogOpen}
        onStartTimer={() => {
          // Timer started, dialog will close automatically
          toast({
            title: "Timer Started",
            description: "Your timer is now running",
          });
        }}
      />
    </div>
  );
};

export default TimeTracking;
