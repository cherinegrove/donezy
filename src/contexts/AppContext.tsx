import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppContextType } from './AppContextType';
import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole, Note, TaskLog, TaskStatusDefinition, ProjectStatusDefinition, CustomField, TaskStatus, TimeEntryStatus, TaskFile } from "@/types";
import { CustomDashboard, SavedReport } from "@/types/dashboard";
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { mockUsers, mockTeams, mockClients, mockProjects, mockTasks, mockTimeEntries, mockMessages, mockPurchases, mockProjectTemplates, mockTaskTemplates, mockCustomRoles, mockCustomFields, mockDashboards } from "@/data/mockData";
import { useToast } from '@/hooks/use-toast';
import { logTimeEntryEvent } from '@/utils/timeEntryEventLogger';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { toast } = useToast();
  // State management
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [pausedTimeEntries, setPausedTimeEntries] = useState<TimeEntry[]>([]);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>([
    { id: '1', label: 'Backlog', value: 'backlog', color: 'bg-gray-500', order: 0 },
    { id: '2', label: 'To Do', value: 'todo', color: 'bg-blue-500', order: 1 },
    { id: '3', label: 'In Progress', value: 'in-progress', color: 'bg-yellow-500', order: 2 },
    { id: '4', label: 'Review/Awaiting Feedback', value: 'review', color: 'bg-orange-500', order: 3 },
    { id: '5', label: 'Done', value: 'done', color: 'bg-green-500', order: 4 },
  ]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusDefinition[]>([]);
  const [customDashboards, setCustomDashboards] = useState<CustomDashboard[]>([
    {
      id: 'projects-dashboard',
      name: 'Projects Dashboard',
      description: 'Custom reports for projects',
      reportIds: [],
      layout: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tasks-dashboard', 
      name: 'Tasks Dashboard',
      description: 'Custom reports for tasks',
      reportIds: [],
      layout: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'time-dashboard',
      name: 'Time Dashboard', 
      description: 'Custom reports for time entries',
      reportIds: [],
      layout: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'billing-dashboard',
      name: 'Billing Dashboard',
      description: 'Custom reports for billing and purchases', 
      reportIds: [],
      layout: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Helper function to safely parse JSON fields
  const safeParseJson = (value: any, defaultValue: any = {}) => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  };

  // Helper function to convert database users to User type
  const convertDbUserToUser = (dbUser: any): User => {
    return {
      id: dbUser.auth_user_id, // Use auth_user_id as the id
      auth_user_id: dbUser.auth_user_id,
      name: dbUser.name,
      email: dbUser.email,
      avatar: dbUser.avatar || undefined,
      roleId: dbUser.role || "user", // Use 'role' field from database directly
      organizationId: dbUser.organization_id || undefined,
      teamIds: dbUser.team_ids || [],
      jobTitle: dbUser.job_title || undefined,
      clientId: dbUser.client_id || undefined,
      phone: dbUser.phone || undefined,
      employmentType: dbUser.employment_type || undefined,
      billingType: dbUser.billing_type || undefined,
      hourlyRate: dbUser.hourly_rate || undefined,
      monthlyRate: dbUser.monthly_rate || undefined,
      billingRate: dbUser.billing_rate || undefined,
      currency: dbUser.currency || undefined,
      clientRole: dbUser.client_role || undefined,
      permissions: safeParseJson(dbUser.permissions, {}),
      managerId: dbUser.manager_id || undefined,
      notificationPreferences: safeParseJson(dbUser.notification_preferences, {}),
      is_guest: dbUser.is_guest || false,
      guest_of_user_id: dbUser.guest_of_user_id || undefined,
      guest_permissions: safeParseJson(dbUser.guest_permissions, {})
    };
  };

  // Data loading functions
  const loadUsers = async () => {
    if (!session?.user) {
      console.log('❌ No session available for loading users');
      return;
    }
    
    try {
      console.log('🔄 Loading users with session:', session.user.id);
      console.log('🔄 Session user email:', session.user.email);
      
      // Load users and system roles in parallel
      const [usersResult, systemRolesResult] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('user_system_roles').select(`
          user_id,
          system_roles!inner (name)
        `)
      ]);
      
      if (usersResult.error) {
        console.error('Error loading users:', usersResult.error);
        return;
      }
      
      const data = usersResult.data;
      
      // Build a map of user_id -> system role names
      const systemRolesMap: Record<string, string[]> = {};
      if (systemRolesResult.data) {
        systemRolesResult.data.forEach((usr: any) => {
          const userId = usr.user_id;
          const roleName = usr.system_roles?.name;
          if (roleName) {
            if (!systemRolesMap[userId]) {
              systemRolesMap[userId] = [];
            }
            systemRolesMap[userId].push(roleName);
          }
        });
      }
      console.log('🔐 System roles map:', systemRolesMap);
      
      console.log('🔍 Raw DB data:', data);
      const convertedUsers = data?.map((dbUser: any) => ({
        ...convertDbUserToUser(dbUser),
        systemRoles: systemRolesMap[dbUser.auth_user_id] || []
      })) || [];
      console.log('🔍 Converted users:', convertedUsers.length);
      setUsers(convertedUsers);
      
      // Set current user based on auth_user_id match from raw DB data
      const sessionUserDb = data?.find((dbUser: any) => dbUser.auth_user_id === session.user.id);
      console.log('🔍 Looking for user with auth_user_id:', session.user.id);
      console.log('🔍 Available DB users:', data?.map((dbUser: any) => ({ 
        auth_user_id: dbUser.auth_user_id, 
        email: dbUser.email, 
        name: dbUser.name 
      })));
      console.log('🔍 Found session user in DB:', sessionUserDb ? sessionUserDb.name : 'NOT FOUND');
      
      if (sessionUserDb) {
        const sessionUser = {
          ...convertDbUserToUser(sessionUserDb),
          systemRoles: systemRolesMap[sessionUserDb.auth_user_id] || []
        };
        console.log('✅ Current user set:', sessionUser.name, 'System roles:', sessionUser.systemRoles);
        setCurrentUser(sessionUser);
      } else {
        console.warn('⚠️ User not found by auth_user_id - trying email fallback');
        // Fallback to email match
        const emailUser = convertedUsers.find(u => u.email === session.user.email);
        if (emailUser) {
          console.log('✅ Current user set by email:', emailUser.name);
          setCurrentUser(emailUser);
        } else {
          console.warn('⚠️ User not found by auth_user_id OR email');
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClients = async () => {
    if (!session?.user) return;
    
    console.log('🔄 Loading clients...');
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) {
        console.error('❌ Error loading clients:', error);
        return;
      }
      
      console.log('📊 Raw client data from Supabase:', data);
      
      const convertedClients = data?.map((client: any) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone || undefined,
        address: client.address || undefined,
        website: client.website || undefined,
        createdAt: client.created_at,
        status: (client.status as 'active' | 'inactive') || 'active'
      })) || [];
      
      console.log('✅ Converted clients:', convertedClients.length, convertedClients);
      setClients(convertedClients);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      
      if (error) {
        console.error('Error loading projects:', error);
        return;
      }
      
      const convertedProjects = data?.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        status: (project.status as 'todo' | 'in-progress' | 'done') || 'todo',
        serviceType: (project.service_type as 'project' | 'bank-hours' | 'pay-as-you-go') || 'project',
        startDate: project.start_date || undefined,
        dueDate: project.due_date || undefined,
        allocatedHours: project.allocated_hours || undefined,
        usedHours: project.used_hours || 0,
        teamIds: project.team_ids || [],
        watcherIds: project.watcher_ids || [],
        ownerId: project.owner_id || undefined,
        collaboratorIds: project.collaborator_ids || [],
        google_chat_settings: project.google_chat_settings || undefined
      })) || [];
      
      setProjects(convertedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async () => {
    if (!session?.user) return;
    
    try {
      // Load tasks in parallel with comments and files, with reasonable limits
      const [tasksResult, commentsResult, filesResult] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('comments').select('*').order('created_at', { ascending: true }).limit(1000),
        supabase.from('task_files').select('*').limit(500),
      ]);

      const { data, error } = tasksResult;
      if (error) {
        console.error('Error loading tasks:', error);
        return;
      }

      const { data: commentsData, error: commentsError } = commentsResult;
      if (commentsError) {
        console.error('Error loading comments:', commentsError);
      }

      const { data: filesData, error: filesError } = filesResult;
      if (filesError) {
        console.error('Error loading task files:', filesError);
      }

      // Group comments by task_id
      const commentsByTask: { [key: string]: any[] } = {};
      if (commentsData) {
        commentsData.forEach(comment => {
          if (!commentsByTask[comment.task_id]) {
            commentsByTask[comment.task_id] = [];
          }
          // Determine if comment was edited by comparing created_at and updated_at
          const isEdited = comment.updated_at && comment.created_at !== comment.updated_at;
          commentsByTask[comment.task_id].push({
            id: comment.id,
            userId: comment.user_id,
            content: comment.content,
            timestamp: comment.created_at,
            mentionedUserIds: comment.mentioned_user_ids || [],
            images: comment.images || [],
            edited: isEdited,
            editedAt: isEdited ? comment.updated_at : undefined
          });
        });
      }

      // Group files by task_id
      const filesByTask: { [key: string]: TaskFile[] } = {};
      if (filesData) {
        filesData.forEach(file => {
          if (!filesByTask[file.task_id]) {
            filesByTask[file.task_id] = [];
          }
          filesByTask[file.task_id].push({
            id: file.id,
            name: file.name,
            url: file.external_url || file.file_path || '',
            externalUrl: file.external_url,
            isExternalLink: file.is_external_link || false,
            size: file.file_size || 0,
            sizeKb: Math.round((file.file_size || 0) / 1024),
            uploadedAt: file.uploaded_at
          });
        });
      }
      
      const convertedTasks = data?.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        projectId: task.project_id,
        assigneeId: task.assignee_id || undefined,
        status: (task.status as TaskStatus) || 'backlog',
        priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
        dueDate: task.due_date || undefined,
        estimatedHours: task.estimated_hours || undefined,
        actualHours: task.actual_hours || undefined,
        createdAt: task.created_at,
        watcherIds: task.watcher_ids || [],
        comments: commentsByTask[task.id] || [],
        collaboratorIds: task.collaborator_ids || [],
        relatedTaskIds: task.related_task_ids || [],
        checklist: task.checklist || [],
        files: filesByTask[task.id] || [],
        backlogReason: task.backlog_reason || undefined,
        dueDateChangeReason: task.due_date_change_reason || undefined,
        awaitingFeedbackDetails: task.awaiting_feedback_details || undefined,
        lastDueDateChange: task.last_due_date_change || undefined,
        reminderDate: task.reminder_date || undefined,
        orderIndex: task.order_index || 0
      })) || [];
      
      setTasks(convertedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!session?.user) return;
    
    try {
      const currentAuthUserId = session.user.id;
      // Only load entries for the current user — prevents loading 600+ rows from all users
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('auth_user_id', currentAuthUserId)
        .order('start_time', { ascending: false })
        .limit(500);
      
      if (error) {
        console.error('Error loading time entries:', error);
        return;
      }
      
      
      
      const convertedTimeEntries = data?.map((entry: any) => ({
        id: entry.id,
        userId: entry.user_id,
        authUserId: entry.auth_user_id, // Also track auth_user_id for robust matching
        taskId: entry.task_id || '',
        projectId: entry.project_id || undefined,
        clientId: entry.client_id || undefined,
        startTime: entry.start_time,
        endTime: entry.end_time || undefined,
        duration: entry.duration || 0,
        description: entry.notes || undefined,
        status: (entry.status as TimeEntryStatus) || 'pending',
        notes: entry.notes || undefined,
        rejectionReason: entry.rejection_reason || undefined,
        timerStatus: entry.timer_status || undefined
      })) || [];
      
      setTimeEntries(convertedTimeEntries);
      
      if (!currentAuthUserId) {
        return;
      }
      
      // Only detect ACTIVE timers (not paused ones) for the main activeTimeEntry
      const activeEntries = convertedTimeEntries.filter(entry => 
        !entry.endTime && (entry as any).timerStatus === 'active' && (
          entry.userId === currentAuthUserId || 
          entry.authUserId === currentAuthUserId ||
          entry.userId === currentAuthUserId.toString()
        )
      );
      
      console.log('🔍 Active timer detection:', { currentAuthUserId, totalEntries: convertedTimeEntries.length, activeFound: activeEntries.length });
      
      console.log('🎯 Found active entries for auth user:', currentAuthUserId, activeEntries);
      
      if (activeEntries.length > 1) {
        console.warn('⚠️ Multiple active timers found! Cleaning up...');
        // Keep the most recent one, stop the others
        const sortedActive = activeEntries.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        const keepTimer = sortedActive[0];
        const stopTimers = sortedActive.slice(1);
        
        // Stop the older timers
        for (const timer of stopTimers) {
          console.log('🛑 Auto-stopping old timer:', timer.id);
          const duration = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / (1000 * 60));
          
          const { error: stopError } = await supabase
            .from('time_entries')
            .update({
              end_time: new Date().toISOString(),
              duration: Math.max(1, duration)
            })
            .eq('id', timer.id);
          
          if (stopError) {
            console.error('Error stopping duplicate timer:', stopError);
          }
        }
        
        setActiveTimeEntry(keepTimer);
        console.log('✅ Cleanup complete. Active timer:', keepTimer.id);
        
        // Reload to get updated data
        setTimeout(() => loadTimeEntries(), 1000);
      } else if (activeEntries.length === 1) {
        setActiveTimeEntry(activeEntries[0]);
        console.log('✅ Single active timer found:', activeEntries[0].id);
        
        // CRITICAL: Restore pause state AND accumulated paused time from database events
        // This prevents the bug where totalPausedTime is lost after page refresh
        try {
          // Fetch ALL events for this timer to calculate total paused time
          const { data: allEvents, error: eventsError } = await supabase
            .from('time_entry_events')
            .select('event_type, details, event_timestamp')
            .eq('time_entry_id', activeEntries[0].id)
            .order('event_timestamp', { ascending: true });
          
          if (!eventsError && allEvents && allEvents.length > 0) {
            // Calculate accumulated paused time from pause/resume pairs
            let accumulatedPausedTime = 0;
            let currentlyPaused = false;
            let currentPausedAt: Date | null = null;
            
            for (const event of allEvents) {
              if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
                currentlyPaused = true;
                const pausedAtStr = (event.details as any)?.pausedAt;
                currentPausedAt = pausedAtStr ? new Date(pausedAtStr) : new Date(event.event_timestamp);
              } else if (event.event_type === 'resumed' && currentlyPaused) {
                // Add the paused duration from the resume event if available
                const pauseDuration = (event.details as any)?.pauseDuration;
                if (typeof pauseDuration === 'number' && pauseDuration > 0) {
                  accumulatedPausedTime += pauseDuration;
                } else if (currentPausedAt) {
                  // Fallback: calculate from timestamps when pauseDuration not in details
                  const resumedAt = new Date(event.event_timestamp);
                  accumulatedPausedTime += resumedAt.getTime() - currentPausedAt.getTime();
                }
                currentlyPaused = false;
                currentPausedAt = null;
              }
            }
            
            // Get the last event to determine current state
            const lastEvent = allEvents[allEvents.length - 1];
            console.log('📊 Last event for timer:', lastEvent.event_type, '| Total pause events:', allEvents.filter(e => e.event_type === 'paused').length);
            console.log('📊 Calculated accumulated paused time:', Math.floor(accumulatedPausedTime / 1000), 'seconds');
            
            if (lastEvent.event_type === 'paused') {
              setIsTimerPaused(true);
              const pausedAtStr = (lastEvent.details as any)?.pausedAt;
              if (pausedAtStr) {
                setPausedAt(new Date(pausedAtStr));
              }
              console.log('⏸️ Timer was paused, restoring pause state');
            } else {
              setIsTimerPaused(false);
              setPausedAt(null);
              console.log('▶️ Timer was not paused');
            }
            
            // CRITICAL: Restore accumulated paused time
            setTotalPausedTime(accumulatedPausedTime);
            console.log('✅ Restored totalPausedTime:', accumulatedPausedTime, 'ms');
          } else {
            // No events found, reset pause state
            setIsTimerPaused(false);
            setPausedAt(null);
            setTotalPausedTime(0);
          }
        } catch (err) {
          console.error('Error checking timer pause state:', err);
          setIsTimerPaused(false);
          setPausedAt(null);
          setTotalPausedTime(0);
        }
      } else {
        setActiveTimeEntry(null);
        setIsTimerPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
        console.log('✅ No active timers found');
      }
      
      // Detect paused timers for current user (DB-backed paused timers)
      const pausedEntries = convertedTimeEntries.filter(entry => 
        !entry.endTime && (entry as any).timerStatus === 'paused' && (
          entry.userId === currentAuthUserId || 
          entry.authUserId === currentAuthUserId ||
          entry.userId === currentAuthUserId.toString()
        )
      );
      setPausedTimeEntries(pausedEntries);
      console.log('⏸️ Found', pausedEntries.length, 'paused timers in database');
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const loadTeams = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      
      if (error) {
        console.error('Error loading teams:', error);
        return;
      }
      
      const convertedTeams = data?.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description || undefined,
        memberIds: [], // Teams don't store memberIds in the database schema
        leaderId: team.leader_id,
        color: team.color
      })) || [];
      
      setTeams(convertedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Set up real-time subscriptions for messages
  useEffect(() => {
    if (!session?.user) return;

    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('🔔 New message received via real-time:', payload);
          
          // Convert the new message and add to state
          const newMessage: Message = {
            id: payload.new.id,
            senderId: payload.new.from_user_id,
            recipientIds: [payload.new.to_user_id],
            content: payload.new.content,
            timestamp: payload.new.timestamp,
            read: payload.new.read,
            taskId: payload.new.task_id,
            projectId: payload.new.project_id
          };
          
          setMessages(prev => [newMessage, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('📝 Message updated via real-time:', payload);
          
          // Update the message in state
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? {
                  ...msg,
                  read: payload.new.read,
                  content: payload.new.content
                }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [session?.user?.id]);

  // Set up real-time subscriptions for tasks
  useEffect(() => {
    if (!session?.user) return;

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 Task updated via real-time:', payload);
          
          // Update the task in state, preserving comments and files
          setTasks(prev => prev.map(task => 
            task.id === payload.new.id 
              ? {
                  ...task,
                  assigneeId: payload.new.assignee_id,
                  collaboratorIds: payload.new.collaborator_ids || [],
                  status: payload.new.status,
                  title: payload.new.title,
                  description: payload.new.description,
                  priority: payload.new.priority,
                  dueDate: payload.new.due_date,
                  startDate: payload.new.start_date,
                  // Preserve comments and files - they are managed separately
                  comments: task.comments,
                  files: task.files
                }
              : task
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 New task created via real-time:', payload);
          
          // Convert and add new task to state
          const newTask: Task = {
            id: payload.new.id,
            title: payload.new.title,
            description: payload.new.description,
            status: payload.new.status,
            priority: payload.new.priority,
            assigneeId: payload.new.assignee_id,
            collaboratorIds: payload.new.collaborator_ids || [],
            projectId: payload.new.project_id,
            dueDate: payload.new.due_date,
            startDate: payload.new.start_date,
            createdAt: payload.new.created_at,
            estimatedHours: payload.new.estimated_hours || 0,
            actualHours: payload.new.actual_hours || 0,
            files: [],
            comments: [],
            customFields: safeParseJson(payload.new.custom_fields, {}),
            subtasks: [],
            watcherIds: payload.new.watcher_ids || []
          };
          
          setTasks(prev => [newTask, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [session?.user?.id]);

  // Set up real-time subscriptions for task logs
  useEffect(() => {
    if (!session?.user) return;

    const taskLogsChannel = supabase
      .channel('task-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_logs'
        },
        (payload) => {
          console.log('📝 New task log created via real-time:', payload);
          
          const newLog: TaskLog = {
            id: payload.new.id,
            taskId: payload.new.task_id,
            userId: payload.new.user_id,
            action: payload.new.action,
            timestamp: payload.new.timestamp,
            details: payload.new.details ? (typeof payload.new.details === 'string' ? payload.new.details : JSON.stringify(payload.new.details)) : undefined
          };
          
          setTaskLogs(prev => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskLogsChannel);
    };
  }, [session?.user?.id]);

  const loadMessages = async () => {
    if (!session?.user) return;
    
    try {
      console.log('🔄 Loading messages...');
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('to_user_id', session.user.id) // Only load messages TO the current user for notifications
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      console.log('🔍 Raw messages from DB:', data);
      
      // Convert database messages to Message interface
      const convertedMessages: Message[] = data?.map((dbMsg: any) => ({
        id: dbMsg.id,
        senderId: dbMsg.from_user_id,
        recipientIds: [dbMsg.to_user_id], 
        content: dbMsg.content,
        timestamp: dbMsg.timestamp,
        read: dbMsg.read,
        taskId: dbMsg.task_id,
        projectId: dbMsg.project_id
      })) || [];
      
      console.log('🔍 Converted messages:', convertedMessages);
      setMessages(convertedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }

  };

  const loadNotes = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*');
      
      if (error) {
        console.error('Error loading notes:', error);
        return;
      }
      
      const convertedNotes = data?.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content || '',
        userId: note.user_id,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        archived: note.archived || false
      })) || [];
      
      setNotes(convertedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadTaskLogs = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('task_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error loading task logs:', error);
        return;
      }

      const convertedLogs: TaskLog[] = data?.map(log => ({
        id: log.id,
        taskId: log.task_id,
        userId: log.user_id,
        action: log.action,
        timestamp: log.timestamp,
        details: log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : undefined
      })) || [];
      
      setTaskLogs(convertedLogs);
    } catch (error) {
      console.error('Error loading task logs:', error);
    }
  };

  const loadTaskStatuses = async () => {
    try {
      console.log('🔍 Loading task statuses...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('🔍 No session for task statuses');
        return;
      }

      const { data, error } = await supabase
        .from('task_status_definitions')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .order('order_index');

      if (error) {
        console.error('Error loading task statuses:', error);
        return;
      }

      console.log('🔍 Task statuses loaded:', data?.length || 0);

      // Load existing statuses (defaults are created by migration if none exist)
      if (data && data.length > 0) {
        const convertedStatuses: TaskStatusDefinition[] = data.map(status => ({
          id: status.id,
          label: status.name,
          value: status.value || status.name.toLowerCase().replace(/\s+/g, '-'),
          color: status.color,
          order: status.order_index,
        }));

        setTaskStatuses(convertedStatuses);
      }
    } catch (error) {
      console.error('Error loading task statuses:', error);
    }
  };

  const loadProjectStatuses = async () => {
    try {
      console.log('🔍 Loading project statuses...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('🔍 No session for project statuses');
        return;
      }

      const { data, error } = await supabase
        .from('project_status_definitions')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .order('order_index');

      if (error) {
        console.error('Error loading project statuses:', error);
        return;
      }

      console.log('🔍 Project statuses loaded:', data?.length || 0);

      const convertedStatuses: ProjectStatusDefinition[] = (data || []).map(status => ({
        id: status.id,
        label: status.name,
        value: status.name.toLowerCase().replace(/\s+/g, '-'),
        color: status.color,
        order: status.order_index,
        isFinal: status.is_final || false,
      }));

      setProjectStatuses(convertedStatuses);
    } catch (error) {
      console.error('Error loading project statuses:', error);
    }
  };

  const loadCustomRoles = async () => {
    if (!session?.user) return;
    
    try {
      console.log('🔍 Loading custom roles...');
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('auth_user_id', session.user.id);
      
      if (error) {
        console.error('Error loading custom roles:', error);
        return;
      }
      
      console.log('🔍 Custom roles loaded:', data?.length || 0);
      
      const convertedRoles: CustomRole[] = (data || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description || '',
        permissions: safeParseJson(role.permissions, {}),
        color: role.color
      }));
      
      setCustomRoles(convertedRoles);
    } catch (error) {
      console.error('Error loading custom roles:', error);
    }
  };

  // Initialize default dashboard if none exists
  const initializeDefaultDashboard = () => {
    // Only create default dashboard if none exist
    if (customDashboards.length === 0) {
      const defaultDashboard: CustomDashboard = {
        id: 'default-dashboard',
        name: 'My Dashboard',
        description: 'Default dashboard for all your reports',
        reportIds: [],
        layout: [],
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCustomDashboards([defaultDashboard]);
    }
  };

  const loadTaskTemplates = async () => {
    try {
      console.log('Loading task templates from Supabase...');
      
      // Load all templates (not filtering by user for now to get your existing templates)
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading task templates:', error);
        setTaskTemplates([]);
        return;
      }

      console.log('Task templates loaded from DB:', data?.length || 0);
      console.log('Templates:', data);
      setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
      setTaskTemplates([]);
    }
  };

  const loadProjectTemplates = async () => {
    try {
      console.log('Loading project templates from Supabase...');
      
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading project templates:', error);
        setProjectTemplates([]);
        return;
      }

      console.log('Project templates loaded from DB:', data?.length || 0);
      
      // Transform database format to ProjectTemplate interface
      const transformedTemplates: ProjectTemplate[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        serviceType: (template.service_type as 'project' | 'bank-hours' | 'pay-as-you-go') || 'project',
        defaultDuration: template.default_duration || 0,
        allocatedHours: template.allocated_hours || 0,
        customFields: template.custom_fields || [],
        teamIds: template.team_ids || [],
        tags: template.tags || [],
        usageCount: template.usage_count || 0,
        tasks: [], // Will be loaded separately if needed
        createdBy: template.auth_user_id,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }));
      
      setProjectTemplates(transformedTemplates);
    } catch (error) {
      console.error('Error loading project templates:', error);
      setProjectTemplates([]);
    }
  };

  // Track the last user ID we loaded data for — prevents reloads on token refresh
  const loadedForUserIdRef = React.useRef<string | null>(null);

  // Load all data when session is available, but ONLY when the user ID changes
  useEffect(() => {
    const userId = session?.user?.id ?? null;

    if (userId && userId !== loadedForUserIdRef.current) {
      loadedForUserIdRef.current = userId;
      console.log('🔍 Session available, loading data for user:', userId);
      // Use setTimeout to prevent potential auth deadlocks
      setTimeout(() => {
        loadUsers();
        loadClients();
        loadProjects();
        loadTasks();
        loadTimeEntries();
        loadTeams();
        loadMessages();
        loadNotes();
        loadTaskLogs();
        loadTaskStatuses();
        loadProjectStatuses();
        loadCustomRoles();
        loadTaskTemplates();
        loadProjectTemplates();
        initializeDefaultDashboard();
      }, 100);
    } else if (!userId) {
      loadedForUserIdRef.current = null;
      console.log('🔍 No session available');
    }
  }, [session]);

  // Authentication setup with better session handling
  useEffect(() => {
    console.log('🔍 Setting up auth listener');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('🔍 Initial session:', initialSession ? `User: ${initialSession.user?.email}` : 'No session');
      console.log('🔍 Full initial session object:', initialSession);
      setSession(initialSession);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔍 Auth state changed:', event, newSession ? `User: ${newSession.user?.email}` : 'No session');
      
      // For token refreshes, just update the session object silently — do NOT trigger a full data reload
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        return;
      }

      setSession(newSession);
      
      if (event === 'SIGNED_OUT') {
        // Clear all state on sign out
        setCurrentUser(null);
        setUsers([]);
        setTeams([]);
        setClients([]);
        setProjects([]);
        setTasks([]);
        setTimeEntries([]);
        setMessages([]);
        setPurchases([]);
        setProjectTemplates([]);
        setCustomRoles([]);
        setComments([]);
        setNotes([]);
        setCustomFields([]);
        setActiveTimeEntry(null);
        setTaskLogs([]);
        setTaskStatuses([]);
        setProjectStatuses([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        return false;
      }
      
      // Clear all state
      setCurrentUser(null);
      setUsers([]);
      setTeams([]);
      setClients([]);
      setProjects([]);
      setTasks([]);
      setTimeEntries([]);
      setMessages([]);
      setPurchases([]);
      setProjectTemplates([]);
      setCustomRoles([]);
      setComments([]);
      setNotes([]);
      setCustomFields([]);
      setActiveTimeEntry(null);
      setTaskLogs([]);
      setTaskStatuses([]);
      setProjectStatuses([]);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  // User functions
  const addUser = async (user: Omit<User, 'id'>) => {
    if (!session?.user) return;
    
    try {
      // For new user invitations, don't set auth_user_id yet - they'll get it when they sign up
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: null, // Set to null for invited users
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.roleId,
          team_ids: user.teamIds || [],
          job_title: user.jobTitle,
          client_id: user.clientId,
          phone: user.phone,
          employment_type: user.employmentType,
          billing_type: user.billingType,
          hourly_rate: user.hourlyRate,
          monthly_rate: user.monthlyRate,
          billing_rate: user.billingRate,
          currency: user.currency,
          client_role: user.clientRole,
          permissions: user.permissions ? JSON.stringify(user.permissions) : null,
          manager_id: user.managerId,
          notification_preferences: user.notificationPreferences ? JSON.stringify(user.notificationPreferences) : null,
          is_guest: user.is_guest,
          guest_of_user_id: user.guest_of_user_id,
          guest_permissions: user.guest_permissions ? JSON.stringify(user.guest_permissions) : null,
          organization_id: currentUser?.organizationId // Assign new users to the current user's organization
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user:', error);
        return;
      }

      if (data) {
        const newUser = convertDbUserToUser(data);
        setUsers(prev => [...prev, newUser]);
        
        // Send invitation email via Supabase Auth
        try {
          const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
            body: {
              email: user.email,
              name: user.name,
              role: user.roleId,
              inviterName: currentUser?.name || 'Team Admin',
              companyName: "Donezy"
            }
          });

          if (emailError) {
            console.error('Error sending invitation email:', emailError);
          } else {
            console.log('Invitation email sent successfully to:', user.email);
          }
        } catch (emailErr) {
          console.error('Error sending invitation email:', emailErr);
        }
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (!session?.user) return;
    
    console.log('📝 updateUser called with:', { userId, updates });
    
    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.roleId !== undefined) dbUpdates.role = updates.roleId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.teamIds !== undefined) dbUpdates.team_ids = updates.teamIds;
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.employmentType !== undefined) dbUpdates.employment_type = updates.employmentType;
      if (updates.billingType !== undefined) dbUpdates.billing_type = updates.billingType;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
      if (updates.monthlyRate !== undefined) dbUpdates.monthly_rate = updates.monthlyRate;
      if (updates.billingRate !== undefined) dbUpdates.billing_rate = updates.billingRate;
      if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
      if (updates.clientRole !== undefined) dbUpdates.client_role = updates.clientRole;
      if (updates.permissions !== undefined) dbUpdates.permissions = JSON.stringify(updates.permissions);
      if (updates.managerId !== undefined) dbUpdates.manager_id = updates.managerId;
      if (updates.notificationPreferences !== undefined) dbUpdates.notification_preferences = JSON.stringify(updates.notificationPreferences);
      if (updates.is_guest !== undefined) dbUpdates.is_guest = updates.is_guest;
      if (updates.guest_of_user_id !== undefined) dbUpdates.guest_of_user_id = updates.guest_of_user_id;
      if (updates.guest_permissions !== undefined) dbUpdates.guest_permissions = JSON.stringify(updates.guest_permissions);

      console.log('📝 Database updates to apply:', dbUpdates);

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('auth_user_id', userId)
        .select();

      if (error) {
        console.error('❌ Error updating user:', error);
        return;
      }

      console.log('✅ User updated successfully:', data);

      setUsers(prev => prev.map(user => 
        user.auth_user_id === userId ? { ...user, ...updates } : user
      ));
    } catch (error) {
      console.error('❌ Error updating user:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!session?.user) return;
    
    console.log('🗑️ Attempting to delete user with ID:', userId);
    const userToDelete = users.find(u => u.auth_user_id === userId);
    console.log('🗑️ User to delete:', userToDelete);
    
    try {
      // Hard delete: Remove user from database completely
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('auth_user_id', userId)
        .select();

      if (error) {
        console.error('❌ Error deleting user:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return;
      }

      console.log('✅ User successfully deleted from database:', data);

      // Update local state to remove the user from the list
      setUsers(prev => {
        const updatedUsers = prev.filter(user => user.auth_user_id !== userId);
        console.log('🔄 Updated users state, user removed from list');
        return updatedUsers;
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
    }
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.auth_user_id === userId);
  };

  // Client functions
  const addClient = async (client: Omit<Client, 'id'>) => {
    console.log("🔵 addClient called with:", client);
    if (!session?.user) {
      console.log("❌ No session/user, returning early");
      return;
    }
    
    try {
      console.log("🔵 Inserting client into database...");
      const { data, error } = await supabase
        .from('clients')
        .insert({
          auth_user_id: session.user.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          website: client.website,
          status: client.status || 'active'
        })
        .select()
        .single();
      console.log("🔵 Database insert result:", { data, error });

      if (error) {
        console.error('Error adding client:', error);
        return;
      }

      if (data) {
        const newClient: Client = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          address: data.address || undefined,
          website: data.website || undefined,
          createdAt: data.created_at,
          status: (data.status as 'active' | 'inactive') || 'active'
        };
        console.log("🔵 Adding client to state:", newClient);
        setClients(prev => [...prev, newClient]);
      }
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', clientId);

      if (error) {
        console.error('Error updating client:', error);
        return;
      }

      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, ...updates } : client
      ));
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        console.error('Error deleting client:', error);
        return;
      }

      setClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const getClientById = (clientId: string): Client | undefined => {
    return clients.find(client => client.id === clientId);
  };

  // Project functions
  const addProject = async (project: Omit<Project, 'id'>) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          auth_user_id: session.user.id,
          name: project.name,
          description: project.description,
          client_id: project.clientId,
          status: project.status,
          service_type: project.serviceType,
          start_date: project.startDate,
          due_date: project.dueDate,
          allocated_hours: project.allocatedHours,
          used_hours: project.usedHours,
          team_ids: project.teamIds || [],
          watcher_ids: project.watcherIds || [],
          owner_id: project.ownerId || null,
          collaborator_ids: project.collaboratorIds || []
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding project:', error);
        return;
      }

      if (data) {
        const newProject: Project = {
          id: data.id,
          name: data.name,
          description: data.description,
          clientId: data.client_id,
          status: (data.status as 'todo' | 'in-progress' | 'done') || 'todo',
          serviceType: (data.service_type as 'project' | 'bank-hours' | 'pay-as-you-go') || 'project',
          startDate: data.start_date || undefined,
          dueDate: data.due_date || undefined,
          allocatedHours: data.allocated_hours || undefined,
          usedHours: data.used_hours || 0,
          teamIds: data.team_ids || [],
          watcherIds: data.watcher_ids || [],
          ownerId: data.owner_id || undefined,
          collaboratorIds: data.collaborator_ids || [],
          google_chat_settings: data.google_chat_settings || undefined
        };
        setProjects(prev => [...prev, newProject]);
      }
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.allocatedHours !== undefined) dbUpdates.allocated_hours = updates.allocatedHours;
      if (updates.usedHours !== undefined) dbUpdates.used_hours = updates.usedHours;
      if (updates.teamIds !== undefined) dbUpdates.team_ids = updates.teamIds;
      if (updates.watcherIds !== undefined) dbUpdates.watcher_ids = updates.watcherIds;
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
      if (updates.collaboratorIds !== undefined) dbUpdates.collaborator_ids = updates.collaboratorIds;
      if ((updates as any).google_chat_settings !== undefined) dbUpdates.google_chat_settings = (updates as any).google_chat_settings;

      const { error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project:', error);
        return;
      }

      setProjects(prev => prev.map(project => 
        project.id === projectId ? { ...project, ...updates } : project
      ));
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const deleteProject = async (projectId: string): Promise<{ success: boolean; error?: string }> => {
    if (!session?.user) {
      return { success: false, error: 'You must be logged in to delete projects' };
    }
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        
        // Provide user-friendly error messages
        if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
          return { success: false, error: 'You do not have permission to delete this project. Only the project owner can delete it.' };
        }
        
        return { success: false, error: error.message || 'Failed to delete project' };
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: 'An unexpected error occurred while deleting the project' };
    }
  };

  const getProjectById = (projectId: string): Project | undefined => {
    return projects.find(project => project.id === projectId);
  };

  // Task functions
  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'timeEntries' | 'comments'>): Promise<string | undefined> => {
    console.log('🟢 addTask called with:', task);
    
    if (!session?.user) {
      console.log('❌ No session or user found');
      return undefined;
    }
    
    console.log('🟢 Session user ID:', session.user.id);
    
    try {
      console.log('🟢 Attempting to insert task into database...');
      
      const insertData: any = {
        auth_user_id: session.user.id,
        title: task.title,
        description: task.description,
        project_id: task.projectId || null,
        assignee_id: task.assigneeId || null,
        status: task.status,
        priority: task.priority,
        due_date: task.dueDate || null,
        reminder_date: task.reminderDate || null,
        estimated_hours: task.estimatedHours,
        actual_hours: task.actualHours,
        watcher_ids: task.watcherIds || [],
        collaborator_ids: task.collaboratorIds || [],
        related_task_ids: task.relatedTaskIds || [],
        checklist: task.checklist || []
      };
      
      console.log('🟢 Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error adding task:', error);
        throw error;
      }

      console.log('🟢 Task inserted successfully:', data);

      if (data) {
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          projectId: data.project_id,
          assigneeId: data.assignee_id || undefined,
          status: (data.status as TaskStatus) || 'backlog',
          priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
          dueDate: data.due_date || undefined,
          estimatedHours: data.estimated_hours || undefined,
          actualHours: data.actual_hours || undefined,
          createdAt: data.created_at,
          watcherIds: data.watcher_ids || [],
          comments: [],
          collaboratorIds: data.collaborator_ids || [],
          relatedTaskIds: data.related_task_ids || []
        };
        
        console.log('🟢 Adding task to local state:', newTask);
        setTasks(prev => {
          const newTasks = [...prev, newTask];
          console.log('🟢 New tasks array length:', newTasks.length);
          return newTasks;
        });
        console.log('🟢 Task successfully added to local state');
        
        // Send Google Chat notification asynchronously
        if (data.project_id) {
          console.log('🔔 Sending task_created notification for task:', data.id);
          supabase.functions.invoke('send-task-notification', {
            body: {
              taskId: data.id,
              projectId: data.project_id,
              eventType: 'task_created',
              userId: session.user.id
            }
          }).then(({ error }) => {
            if (error) {
              console.error('❌ Error sending task created notification:', error);
            } else {
              console.log('✅ Task created notification sent successfully');
            }
          });
        }
        
        return data.id;
      }
      
      return undefined;
    } catch (error) {
      console.error('❌ Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<string | undefined> => {
    if (!session?.user) return undefined;
    
    try {
      // Get current task for comparison
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return undefined;

      const dbUpdates: any = {};
      const changes: string[] = [];
      
      if (updates.title !== undefined && updates.title !== currentTask.title) {
        dbUpdates.title = updates.title;
        changes.push(`updated title to "${updates.title}"`);
      }
      if (updates.description !== undefined && updates.description !== currentTask.description) {
        dbUpdates.description = updates.description;
        changes.push('updated description');
      }
      if (updates.projectId !== undefined && updates.projectId !== currentTask.projectId) {
        dbUpdates.project_id = updates.projectId;
        changes.push('changed project');
      }
      if (updates.assigneeId !== undefined && updates.assigneeId !== currentTask.assigneeId) {
        dbUpdates.assignee_id = updates.assigneeId;
        const assignee = users.find(u => u.id === updates.assigneeId);
        changes.push(`assigned to ${assignee?.name || 'someone'}`);
      }
      if (updates.status !== undefined && updates.status !== currentTask.status) {
        dbUpdates.status = updates.status;
        changes.push(`changed status from "${currentTask.status}" to "${updates.status}"`);
      }
      if (updates.priority !== undefined && updates.priority !== currentTask.priority) {
        dbUpdates.priority = updates.priority;
        changes.push(`changed priority from "${currentTask.priority}" to "${updates.priority}"`);
      }
      if (updates.dueDate !== undefined && updates.dueDate !== currentTask.dueDate) {
        dbUpdates.due_date = updates.dueDate;
        changes.push('updated due date');
      }
      if (updates.estimatedHours !== undefined && updates.estimatedHours !== currentTask.estimatedHours) {
        dbUpdates.estimated_hours = updates.estimatedHours;
        changes.push(`updated estimated hours to ${updates.estimatedHours}`);
      }
      if (updates.actualHours !== undefined && updates.actualHours !== currentTask.actualHours) {
        dbUpdates.actual_hours = updates.actualHours;
        changes.push(`updated actual hours to ${updates.actualHours}`);
      }
      if (updates.watcherIds !== undefined) {
        dbUpdates.watcher_ids = updates.watcherIds;
        changes.push('updated watchers');
      }
      if (updates.comments !== undefined) {
        dbUpdates.comments = updates.comments;
        changes.push('added a comment');
      }
      if (updates.collaboratorIds !== undefined) {
        dbUpdates.collaborator_ids = updates.collaboratorIds;
        changes.push('updated collaborators');
      }
      if (updates.relatedTaskIds !== undefined) {
        dbUpdates.related_task_ids = updates.relatedTaskIds;
        changes.push('updated related tasks');
      }
      if (updates.checklist !== undefined) {
        // Ensure checklist is properly serialized as JSON for Supabase
        dbUpdates.checklist = JSON.parse(JSON.stringify(updates.checklist));
        console.log('📝 Updating checklist:', dbUpdates.checklist);
        const oldChecklistLength = (currentTask.checklist as any[])?.length || 0;
        const newChecklistLength = (updates.checklist as any[])?.length || 0;
        if (newChecklistLength > oldChecklistLength) {
          changes.push('added checklist item');
        } else if (newChecklistLength < oldChecklistLength) {
          changes.push('removed checklist item');
        } else {
          changes.push('updated checklist');
        }
      }
      if (updates.reminderDate !== undefined) {
        dbUpdates.reminder_date = updates.reminderDate;
        changes.push('updated reminder date');
      }
      if (updates.backlogReason !== undefined) {
        dbUpdates.backlog_reason = updates.backlogReason;
      }
      if (updates.dueDateChangeReason !== undefined) {
        dbUpdates.due_date_change_reason = updates.dueDateChangeReason;
        dbUpdates.last_due_date_change = new Date().toISOString();
      }
      if (updates.awaitingFeedbackDetails !== undefined) {
        dbUpdates.awaiting_feedback_details = updates.awaitingFeedbackDetails;
      }
      if (updates.orderIndex !== undefined) {
        dbUpdates.order_index = updates.orderIndex;
      }

      if (Object.keys(dbUpdates).length === 0) {
        return taskId;
      }

      console.log('📝 Sending task update to Supabase:', { taskId, dbUpdates });
      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('❌ Error updating task:', error);
        return undefined;
      }
      
      console.log('✅ Task updated successfully:', data);

      // Create task log entry
      if (changes.length > 0 && currentUser) {
        const logAction = changes.join(', ');
        await supabase
          .from('task_logs')
          .insert({
            task_id: taskId,
            user_id: currentUser.id,
            auth_user_id: session.user.id,
            action: logAction,
            timestamp: new Date().toISOString()
          });
      }

      // Create specific log entries for status-related changes
      if (updates.status !== undefined && updates.status !== currentTask.status && currentUser) {
        await supabase
          .from('task_logs')
          .insert({
            task_id: taskId,
            user_id: currentUser.id,
            auth_user_id: session.user.id,
            action: 'status_changed',
            details: {
              oldStatus: currentTask.status,
              newStatus: updates.status
            },
            timestamp: new Date().toISOString()
          });
      }

      if (updates.backlogReason !== undefined && currentUser) {
        await supabase
          .from('task_logs')
          .insert({
            task_id: taskId,
            user_id: currentUser.id,
            auth_user_id: session.user.id,
            action: 'backlog_reason_added',
            details: {
              backlogReason: updates.backlogReason
            },
            timestamp: new Date().toISOString()
          });
      }

      if (updates.dueDate !== undefined && updates.dueDate !== currentTask.dueDate && currentUser) {
        await supabase
          .from('task_logs')
          .insert({
            task_id: taskId,
            user_id: currentUser.id,
            auth_user_id: session.user.id,
            action: 'due_date_changed',
            details: {
              dueDate: updates.dueDate,
              dueDateChangeReason: updates.dueDateChangeReason
            },
            timestamp: new Date().toISOString()
          });
      }

      if (updates.awaitingFeedbackDetails !== undefined && currentUser) {
        await supabase
          .from('task_logs')
          .insert({
            task_id: taskId,
            user_id: currentUser.id,
            auth_user_id: session.user.id,
            action: 'awaiting_feedback_details_added',
            details: {
              awaitingFeedbackDetails: updates.awaitingFeedbackDetails
            },
            timestamp: new Date().toISOString()
          });
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
      
      // Build changes summary for notifications
      const changesSummary: Record<string, string> = {};
      if (updates.status && updates.status !== currentTask.status) {
        changesSummary.status = updates.status;
      }
      if (updates.priority && updates.priority !== currentTask.priority) {
        changesSummary.priority = updates.priority;
      }
      if (updates.assigneeId !== undefined && updates.assigneeId !== currentTask.assigneeId) {
        const assignee = users.find(u => u.auth_user_id === updates.assigneeId);
        changesSummary.assignee = assignee?.name || 'Unassigned';
      }
      if (updates.dueDate !== undefined && updates.dueDate !== currentTask.dueDate) {
        changesSummary.due_date = updates.dueDate || 'No due date';
      }

      // Send notification for task completion
      if (updates.status === 'done' && currentTask.status !== 'done' && currentTask.projectId) {
        console.log('🔔 Sending task_completed notification for task:', taskId);
        supabase.functions.invoke('send-task-notification', {
          body: {
            taskId,
            projectId: currentTask.projectId,
            eventType: 'task_completed',
            userId: session.user.id,
            changes: changesSummary
          }
        }).then(({ error }) => {
          if (error) {
            console.error('❌ Error sending completion notification:', error);
          } else {
            console.log('✅ Completion notification sent successfully');
          }
        });
      }
      
      // Send notification for status changes (not to done)
      if (updates.status && updates.status !== 'done' && updates.status !== currentTask.status && currentTask.projectId) {
        console.log('🔔 Sending status_changed notification for task:', taskId);
        supabase.functions.invoke('send-task-notification', {
          body: {
            taskId,
            projectId: currentTask.projectId,
            eventType: 'status_changed',
            userId: session.user.id,
            oldStatus: currentTask.status,
            newStatus: updates.status,
            changes: changesSummary
          }
        }).then(({ error }) => {
          if (error) {
            console.error('❌ Error sending status change notification:', error);
          } else {
            console.log('✅ Status change notification sent successfully');
          }
        });
      }
      
      // Send notification for other task updates (when no status change)
      if (currentTask.projectId && !updates.status && Object.keys(changesSummary).length > 0) {
        console.log('🔔 Sending task_updated notification for task:', taskId);
        supabase.functions.invoke('send-task-notification', {
          body: {
            taskId,
            projectId: currentTask.projectId,
            eventType: 'task_updated',
            userId: session.user.id,
            changes: changesSummary
          }
        }).then(({ error }) => {
          if (error) {
            console.error('❌ Error sending update notification:', error);
          } else {
            console.log('✅ Update notification sent successfully');
          }
        });
      }

      return taskId;
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    if (!session?.user) return false;
    
    try {
      // Delete related records first to avoid foreign key constraint violations
      // Delete messages linked to this task
      await supabase.from('messages').delete().eq('task_id', taskId);
      
      // Delete task files
      await supabase.from('task_files').delete().eq('task_id', taskId);
      
      // Delete task reminders
      await supabase.from('task_reminders').delete().eq('task_id', taskId);
      
      // Delete comments
      await supabase.from('comments').delete().eq('task_id', taskId);
      
      // Now delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete task. You may not have permission to delete this task.",
          variant: "destructive",
        });
        return false;
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
      return false;
    }
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  // Time Entry functions
  const addTimeEntry = async (timeEntry: Omit<TimeEntry, 'id'>) => {
    if (!session?.user) return;
    
    try {
      // SAFEGUARD: If creating a new ACTIVE timer (no endTime), ensure all other active timers are stopped first
      // This is a belt-and-suspenders check - startTimeTracking should already do this
      if (!timeEntry.endTime && currentUser) {
        console.log('🔒 addTimeEntry safeguard: Checking for active timers before creating new active timer');
        const { data: activeTimers, error: fetchError } = await supabase
          .from('time_entries')
          .select('id, start_time')
          .eq('user_id', currentUser.id)
          .eq('timer_status', 'active');
        
        if (!fetchError && activeTimers && activeTimers.length > 0) {
          console.log(`⚠️ Found ${activeTimers.length} active timer(s) that should have been stopped - stopping now`);
          for (const timer of activeTimers) {
            const duration = Math.floor((Date.now() - new Date(timer.start_time).getTime()) / (1000 * 60));
            await supabase
              .from('time_entries')
              .update({
                end_time: new Date().toISOString(),
                duration: Math.max(1, duration),
                notes: 'Auto-stopped by system (safeguard)'
              })
              .eq('id', timer.id);
          }
        }
      }
      
      // CRITICAL: Set timer_status based on whether the entry has an endTime
      // Manual entries (with endTime) must be 'completed' to prevent the active timer
      // cleanup logic from treating them as orphaned active timers and overwriting them
      const timerStatus = timeEntry.endTime ? 'completed' : 'active';
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          auth_user_id: session.user.id,
          user_id: timeEntry.userId,
          task_id: timeEntry.taskId,
          project_id: timeEntry.projectId,
          client_id: timeEntry.clientId,
          start_time: timeEntry.startTime,
          end_time: timeEntry.endTime,
          duration: timeEntry.duration,
          notes: timeEntry.description,
          status: timeEntry.status || 'pending',
          rejection_reason: timeEntry.rejectionReason,
          timer_status: timerStatus
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding time entry:', error);
        return;
      }

      if (data) {
        const newTimeEntry: TimeEntry = {
          id: data.id,
          userId: data.user_id,
          taskId: data.task_id || '',
          projectId: data.project_id || undefined,
          clientId: data.client_id || undefined,
          startTime: data.start_time,
          endTime: data.end_time || undefined,
          duration: data.duration || 0,
          description: data.notes || undefined,
          status: (data.status as TimeEntryStatus) || 'pending',
          notes: data.notes || undefined,
          rejectionReason: data.rejection_reason || undefined,
          timerStatus: data.timer_status || undefined
        };
        setTimeEntries(prev => [...prev, newTimeEntry]);
        
        // NOTE: The 'started' event is logged by the database trigger auto_log_time_entry_started
        // Do NOT log it here to avoid duplicate events
        
        return newTimeEntry;
      }
    } catch (error) {
      console.error('Error adding time entry:', error);
    }
  };

  const updateTimeEntry = async (timeEntryId: string, updates: Partial<TimeEntry>) => {
    if (!session?.user) return;
    
    try {
      // Get the current entry for comparison (for logging changes)
      const currentEntry = timeEntries.find(e => e.id === timeEntryId);
      
      const dbUpdates: any = {};
      const changedFields: string[] = [];
      
      if (updates.userId !== undefined) {
        dbUpdates.user_id = updates.userId;
      }
      if (updates.taskId !== undefined) {
        dbUpdates.task_id = updates.taskId;
        if (currentEntry?.taskId !== updates.taskId) changedFields.push('task');
      }
      if (updates.projectId !== undefined) {
        dbUpdates.project_id = updates.projectId;
        if (currentEntry?.projectId !== updates.projectId) changedFields.push('project');
      }
      if (updates.clientId !== undefined) {
        dbUpdates.client_id = updates.clientId;
      }
      if (updates.startTime !== undefined) {
        dbUpdates.start_time = updates.startTime;
        if (currentEntry?.startTime !== updates.startTime) changedFields.push('startTime');
      }
      if (updates.endTime !== undefined) {
        dbUpdates.end_time = updates.endTime;
        if (currentEntry?.endTime !== updates.endTime) changedFields.push('endTime');
      }
      if (updates.duration !== undefined) {
        dbUpdates.duration = updates.duration;
        if (currentEntry?.duration !== updates.duration) changedFields.push('duration');
      }
      if (updates.description !== undefined) {
        dbUpdates.notes = updates.description;
        if (currentEntry?.description !== updates.description) changedFields.push('notes');
      }
      if (updates.notes !== undefined) {
        dbUpdates.notes = updates.notes;
        if (currentEntry?.notes !== updates.notes) changedFields.push('notes');
      }
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
        if (currentEntry?.status !== updates.status) changedFields.push('status');
      }
      if (updates.rejectionReason !== undefined) {
        dbUpdates.rejection_reason = updates.rejectionReason;
      }

      const { error } = await supabase
        .from('time_entries')
        .update(dbUpdates)
        .eq('id', timeEntryId);

      if (error) {
        console.error('Error updating time entry:', error);
        return;
      }

      // Log manual edits if significant fields changed
      // NOTE: 'stopped' events are logged by the database trigger auto_log_time_entry_stopped
      // Do NOT log 'stopped' here to avoid duplicate events
      const isStoppingTimer = changedFields.includes('endTime') && updates.endTime && !currentEntry?.endTime;
      
      if (changedFields.length > 0 && !isStoppingTimer) {
        // Determine event type (excluding 'stopped' which is handled by DB trigger)
        let eventType: 'manual_edit' | 'duration_changed' | 'notes_changed' | 'project_changed' | 'task_changed' | 'status_changed' = 'manual_edit';
        
        if (changedFields.length === 1) {
          if (changedFields[0] === 'duration') eventType = 'duration_changed';
          else if (changedFields[0] === 'notes') eventType = 'notes_changed';
          else if (changedFields[0] === 'project') eventType = 'project_changed';
          else if (changedFields[0] === 'task') eventType = 'task_changed';
          else if (changedFields[0] === 'status') eventType = 'status_changed';
        }
        
        await logTimeEntryEvent(timeEntryId, eventType, {
          changedFields,
          previousValue: changedFields.reduce((acc, field) => {
            if (field === 'duration') acc[field] = currentEntry?.duration;
            else if (field === 'notes') acc[field] = currentEntry?.notes || currentEntry?.description;
            else if (field === 'project') acc[field] = currentEntry?.projectId;
            else if (field === 'task') acc[field] = currentEntry?.taskId;
            else if (field === 'status') acc[field] = currentEntry?.status;
            else if (field === 'startTime') acc[field] = currentEntry?.startTime;
            else if (field === 'endTime') acc[field] = currentEntry?.endTime;
            return acc;
          }, {} as any),
          newValue: changedFields.reduce((acc, field) => {
            if (field === 'duration') acc[field] = updates.duration;
            else if (field === 'notes') acc[field] = updates.notes || updates.description;
            else if (field === 'project') acc[field] = updates.projectId;
            else if (field === 'task') acc[field] = updates.taskId;
            else if (field === 'status') acc[field] = updates.status;
            else if (field === 'startTime') acc[field] = updates.startTime;
            else if (field === 'endTime') acc[field] = updates.endTime;
            return acc;
          }, {} as any)
        });
      }

      // Sync notes and description fields when updating local state
      const syncedUpdates = { ...updates };
      if (updates.description !== undefined) {
        syncedUpdates.notes = updates.description;
      }
      if (updates.notes !== undefined) {
        syncedUpdates.description = updates.notes;
      }
      
      setTimeEntries(prev => prev.map(entry => 
        entry.id === timeEntryId ? { ...entry, ...syncedUpdates } : entry
      ));

      // Update active time entry if it's the one being updated
      if (activeTimeEntry?.id === timeEntryId) {
        setActiveTimeEntry(prev => prev ? { ...prev, ...syncedUpdates } : null);
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const deleteTimeEntry = async (timeEntryId: string) => {
    if (!session?.user) return;
    
    try {
      // Soft-delete: mark as cancelled instead of hard-deleting
      // This preserves the audit trail for financial tracking
      const { error } = await supabase
        .from('time_entries')
        .update({ 
          timer_status: 'cancelled',
          end_time: new Date().toISOString()
        })
        .eq('id', timeEntryId);

      if (error) {
        console.error('Error cancelling time entry:', error);
        return;
      }

      // Log the cancellation event
      await logTimeEntryEvent(timeEntryId, 'cancelled', {
        cancelledAt: new Date().toISOString(),
        cancelledBy: session.user.id
      });

      // Remove from active UI lists (but it stays in DB)
      setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
      
      // Clear active time entry if it was cancelled
      if (activeTimeEntry?.id === timeEntryId) {
        setActiveTimeEntry(null);
      }
    } catch (error) {
      console.error('Error cancelling time entry:', error);
    }
  };

  // Mutex to prevent race conditions when starting timers
  const isStartingTimer = React.useRef(false);
  const isPausingTimer = React.useRef(false);

  const startTimeTracking = async (taskId?: string, projectId?: string, clientId?: string, resumeFromElapsedMs?: number) => {
    if (!session?.user || !currentUser) return;
    
    // Prevent race conditions - if already starting a timer, ignore this call
    if (isStartingTimer.current) {
      console.log('⚠️ Already starting a timer, ignoring duplicate call');
      return;
    }
    
    isStartingTimer.current = true;
    
    try {
      console.log('🚀 Starting new timer:', { taskId, projectId, clientId });
      
      // RULE: Only ONE active timer at a time
      // First, stop ALL active timers for this user in the database (belt and suspenders)
      const { data: activeTimers, error: fetchError } = await supabase
        .from('time_entries')
        .select('id, start_time, task_id, project_id, client_id')
        .eq('user_id', currentUser.id)
        .eq('timer_status', 'active');
      
      if (fetchError) {
        console.error('Error fetching active timers:', fetchError);
      } else if (activeTimers && activeTimers.length > 0) {
        console.log(`⏸️ Found ${activeTimers.length} active timer(s) to pause (not stop)`);
        
        for (const timer of activeTimers) {
          // FIX: Calculate elapsed time using THIS TIMER's specific pause events
          // NOT the global totalPausedTime which may belong to a different timer
          let timerPausedTime = 0;
          
          try {
            // Fetch pause/resume events specifically for this timer
            const { data: timerEvents, error: eventsError } = await supabase
              .from('time_entry_events')
              .select('event_type, event_timestamp')
              .eq('time_entry_id', timer.id)
              .in('event_type', ['paused', 'resumed', 'auto_paused'])
              .order('event_timestamp', { ascending: true });
            
            if (!eventsError && timerEvents && timerEvents.length > 0) {
              let lastPauseTime: Date | null = null;
              
              for (const event of timerEvents) {
                const eventTime = new Date(event.event_timestamp);
                
                if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
                  lastPauseTime = eventTime;
                } else if (event.event_type === 'resumed' && lastPauseTime) {
                  timerPausedTime += eventTime.getTime() - lastPauseTime.getTime();
                  lastPauseTime = null;
                }
              }
              
              // If timer is currently paused (lastPauseTime set but no resume), add time to now
              if (lastPauseTime) {
                timerPausedTime += Date.now() - lastPauseTime.getTime();
              }
              
              console.log(`📊 Timer ${timer.id.slice(0, 8)} pause time from events: ${Math.floor(timerPausedTime / (1000 * 60))} minutes`);
            }
          } catch (err) {
            console.warn('Error fetching timer events, using raw elapsed:', err);
            // Fallback: use 0 paused time (raw elapsed)
          }
          
          // Calculate elapsed time using the timer's own pause history
          const rawElapsed = Date.now() - new Date(timer.start_time).getTime();
          const elapsedMs = Math.max(0, rawElapsed - timerPausedTime);
          
          console.log(`⏱️ Timer ${timer.id.slice(0, 8)} elapsed calculation:`, {
            rawElapsedMs: rawElapsed,
            timerPausedTimeMs: timerPausedTime,
            finalElapsedMs: elapsedMs,
            finalElapsedMin: Math.floor(elapsedMs / (1000 * 60))
          });
          
          // Check if there's already a recent pause/auto_paused event to prevent duplicates
          const { data: recentPauseEvents } = await supabase
            .from('time_entry_events')
            .select('id, event_type, event_timestamp')
            .eq('time_entry_id', timer.id)
            .in('event_type', ['paused', 'auto_paused'])
            .order('event_timestamp', { ascending: false })
            .limit(1);
          
          const lastPauseEvent = recentPauseEvents?.[0];
          const lastPauseAge = lastPauseEvent 
            ? Date.now() - new Date(lastPauseEvent.event_timestamp).getTime() 
            : Infinity;
          
          // Only log if no pause event in the last 5 seconds (prevents duplicates)
          if (lastPauseAge > 5000) {
            await logTimeEntryEvent(timer.id, 'auto_paused', {
              reason: 'New timer started',
              pausedAt: new Date().toISOString(),
              elapsedMs: elapsedMs,
              timerPausedTime: timerPausedTime,
              newTaskId: taskId
            });
          } else {
            console.log(`⚠️ Skipping duplicate auto_paused event for timer ${timer.id.slice(0, 8)} (last pause was ${Math.floor(lastPauseAge / 1000)}s ago)`);
          }
          
          // Timer is now kept in DB with 'paused' status - no need for localStorage
          // Just notify UI components to refresh
          window.dispatchEvent(new CustomEvent('timersUpdated'));
          
          // Also broadcast event for TimerBox UI update (if mounted)
          window.dispatchEvent(new CustomEvent('pauseActiveTimer', { 
            detail: { 
              timerId: timer.id,
              elapsed: elapsedMs,
              totalPausedTime: timerPausedTime // Use timer's OWN paused time
            } 
          }));
          
          // KEEP the timer in the database with paused status instead of deleting
          // This ensures paused timers persist across browser sessions and devices
          const { error: pauseError } = await supabase
            .from('time_entries')
            .update({ timer_status: 'paused' })
            .eq('id', timer.id);
          
          if (pauseError) {
            console.error('Error pausing timer in DB:', timer.id, pauseError);
          } else {
            console.log('✅ Timer paused in database:', timer.id);
          }
        }
        
        // Clear local activeTimeEntry state
        setActiveTimeEntry(null);
        setIsTimerPaused(false);
        setPausedAt(null);
        setTotalPausedTime(0);
      }
      
      // Create new time entry
      // If resuming from elapsed time, calculate start time to preserve the elapsed duration
      let startTime: string;
      if (resumeFromElapsedMs && resumeFromElapsedMs > 0) {
        // Set start time in the past so elapsed time is preserved
        startTime = new Date(Date.now() - resumeFromElapsedMs).toISOString();
        console.log('🔄 Resuming timer with preserved elapsed time:', Math.floor(resumeFromElapsedMs / 1000), 'seconds');
      } else {
        startTime = new Date().toISOString();
      }
      
      const newTimeEntry: Omit<TimeEntry, 'id'> = {
        userId: currentUser.id,
        taskId: taskId || null,
        projectId: projectId || null,
        clientId: clientId || null,
        startTime: startTime,
        endTime: null,
        duration: null,
        description: null,
        billable: true,
        status: 'pending' as TimeEntryStatus,
      };

      await addTimeEntry(newTimeEntry);
      await loadTimeEntries(); // Reload to get the new active entry
      
      console.log('✅ New timer started');
    } finally {
      isStartingTimer.current = false;
    }
  };

  const stopTimeTracking = async (notes?: string) => {
    if (!activeTimeEntry) return;
    
    const endTime = new Date();
    const startTime = new Date(activeTimeEntry.startTime);
    const rawDurationMs = endTime.getTime() - startTime.getTime();
    
    // FIX 4: Event validation for duration calculation
    // Calculate duration from event logs with validation and fallback
    let totalPausedFromEvents = 0;
    let eventsValid = true;
    let eventValidationWarnings: string[] = [];
    
    try {
      const { data: events, error } = await supabase
        .from('time_entry_events')
        .select('event_type, event_timestamp, details')
        .eq('time_entry_id', activeTimeEntry.id)
        .in('event_type', ['paused', 'resumed', 'auto_paused'])
        .order('event_timestamp', { ascending: true });
      
      if (error) {
        eventsValid = false;
        eventValidationWarnings.push(`DB error fetching events: ${error.message}`);
      } else if (events && events.length > 0) {
        let lastPauseTime: Date | null = null;
        let expectingResume = false;
        
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const eventTime = new Date(event.event_timestamp);
          
          // Validation: Check event timestamp is within timer bounds
          if (eventTime < startTime) {
            eventValidationWarnings.push(`Event ${event.event_type} at ${event.event_timestamp} is before timer start`);
            eventsValid = false;
            continue;
          }
          if (eventTime > endTime) {
            eventValidationWarnings.push(`Event ${event.event_type} at ${event.event_timestamp} is after timer end`);
            eventsValid = false;
            continue;
          }
          
          if (event.event_type === 'paused' || event.event_type === 'auto_paused') {
            // Validation: Check for double-pause without resume
            if (expectingResume && lastPauseTime) {
              eventValidationWarnings.push(`Double pause detected: paused at ${lastPauseTime.toISOString()} then ${event.event_type} at ${eventTime.toISOString()} without resume`);
              // Still process it - use the new pause time (overwrite)
            }
            lastPauseTime = eventTime;
            expectingResume = true;
          } else if (event.event_type === 'resumed') {
            if (!lastPauseTime) {
              // Resume without pause - skip this event
              eventValidationWarnings.push(`Resume at ${eventTime.toISOString()} without prior pause - skipping`);
              continue;
            }
            const pauseDuration = eventTime.getTime() - lastPauseTime.getTime();
            
            // Validation: Check for negative or impossibly long pauses
            if (pauseDuration < 0) {
              eventValidationWarnings.push(`Negative pause duration: ${pauseDuration}ms`);
              eventsValid = false;
            } else if (pauseDuration > rawDurationMs) {
              eventValidationWarnings.push(`Pause duration (${pauseDuration}ms) exceeds total timer duration (${rawDurationMs}ms)`);
              eventsValid = false;
            } else {
              totalPausedFromEvents += pauseDuration;
            }
            lastPauseTime = null;
            expectingResume = false;
          }
        }
        
        // If still paused (lastPauseTime is set), add time from last pause to now
        if (lastPauseTime) {
          const finalPauseDuration = endTime.getTime() - lastPauseTime.getTime();
          if (finalPauseDuration >= 0 && finalPauseDuration <= rawDurationMs) {
            totalPausedFromEvents += finalPauseDuration;
          } else {
            eventValidationWarnings.push(`Final pause duration invalid: ${finalPauseDuration}ms`);
            eventsValid = false;
          }
        }
        
        // Final validation: total paused time shouldn't exceed raw duration
        if (totalPausedFromEvents > rawDurationMs) {
          eventValidationWarnings.push(`Total paused time (${totalPausedFromEvents}ms) exceeds raw duration (${rawDurationMs}ms)`);
          eventsValid = false;
        }
        
        console.log('📊 Event-based pause calculation:', {
          totalPausedMs: totalPausedFromEvents,
          totalPausedMinutes: Math.floor(totalPausedFromEvents / (1000 * 60)),
          eventsValid,
          eventCount: events.length
        });
      }
    } catch (err) {
      console.error('Error fetching events for pause calculation:', err);
      eventsValid = false;
      eventValidationWarnings.push(`Exception: ${err}`);
    }
    
    // Log any validation warnings
    if (eventValidationWarnings.length > 0) {
      console.warn('⚠️ Event validation warnings:', eventValidationWarnings);
    }
    
    // Also check volatile state as backup
    let volatilePausedTime = totalPausedTime;
    if (isTimerPaused && pausedAt) {
      volatilePausedTime += Date.now() - pausedAt.getTime();
    }
    
    // Determine which pause time to use
    let totalTimeToSubtract: number;
    let durationSource: string;
    
    if (eventsValid && totalPausedFromEvents > 0) {
      // Events are valid - use event-based calculation
      totalTimeToSubtract = totalPausedFromEvents;
      durationSource = 'events';
    } else if (!eventsValid && volatilePausedTime > 0 && volatilePausedTime < rawDurationMs) {
      // Events invalid but volatile state looks reasonable - use it
      totalTimeToSubtract = volatilePausedTime;
      durationSource = 'volatile_state_fallback';
      console.warn('⚠️ Using volatile state as fallback due to invalid events');
    } else if (eventsValid && totalPausedFromEvents === 0) {
      // No pause events and that's valid (timer never paused)
      totalTimeToSubtract = 0;
      durationSource = 'no_pauses';
    } else {
      // Fallback: use raw duration (no pause deduction)
      totalTimeToSubtract = 0;
      durationSource = 'raw_fallback';
      console.warn('⚠️ Using raw duration - could not reliably calculate pause time');
    }
    
    const duration = Math.max(0, Math.floor((rawDurationMs - totalTimeToSubtract) / (1000 * 60)));
    
    console.log('⏹️ Final duration calculation:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      rawDurationMinutes: Math.floor(rawDurationMs / (1000 * 60)),
      totalPausedMinutes: Math.floor(totalTimeToSubtract / (1000 * 60)),
      finalDurationMinutes: duration,
      durationSource,
      eventsValid,
      warningCount: eventValidationWarnings.length
    });
    
    // Set end_time, duration, notes AND timer_status to completed
    await updateTimeEntry(activeTimeEntry.id, {
      endTime: endTime.toISOString(),
      duration,
      description: notes
    });
    
    // Ensure timer_status is set to completed
    await supabase
      .from('time_entries')
      .update({ timer_status: 'completed' })
      .eq('id', activeTimeEntry.id);
    
    setActiveTimeEntry(null);
    setIsTimerPaused(false);
    setPausedAt(null);
    setTotalPausedTime(0);
  };

  const pauseTimeTracking = async () => {
    if (!activeTimeEntry || isTimerPaused) return;
    
    // Prevent duplicate pause calls (race condition guard)
    if (isPausingTimer.current) {
      console.log('⚠️ Already pausing timer, ignoring duplicate call');
      return;
    }
    isPausingTimer.current = true;
    
    try {
      const pausedAtTime = new Date();
      setIsTimerPaused(true);
      setPausedAt(pausedAtTime);
      console.log('⏸️ Timer paused in AppContext');
      
      // Update timer_status in database
      await supabase
        .from('time_entries')
        .update({ timer_status: 'paused' })
        .eq('id', activeTimeEntry.id);
      
      // Log the pause event
      await logTimeEntryEvent(activeTimeEntry.id, 'paused', {
        pausedAt: pausedAtTime.toISOString()
      });
    } finally {
      isPausingTimer.current = false;
    }
  };

  const resumeTimeTracking = async () => {
    if (!activeTimeEntry || !isTimerPaused || !pausedAt) return;
    
    console.log('▶️ Resuming paused timer:', activeTimeEntry.id);
    
    const pauseDuration = Date.now() - pausedAt.getTime();
    
    // Sanity check: if pause duration is absurdly long (> 24 hours), something is wrong
    // Log a warning but still record the actual calculated value
    const maxReasonablePause = 24 * 60 * 60 * 1000; // 24 hours in ms
    if (pauseDuration > maxReasonablePause) {
      console.warn('⚠️ Unusually long pause duration detected:', Math.floor(pauseDuration / (1000 * 60)), 'minutes. This may indicate stale state.');
    }
    
    setTotalPausedTime(prev => prev + pauseDuration);
    setIsTimerPaused(false);
    setPausedAt(null);
    console.log('✅ Timer resumed successfully. Pause duration:', Math.floor(pauseDuration / (1000 * 60)), 'minutes');
    
    // Update timer_status in database
    await supabase
      .from('time_entries')
      .update({ timer_status: 'active' })
      .eq('id', activeTimeEntry.id);
    
    // Log the resume event with calculated pause duration
    await logTimeEntryEvent(activeTimeEntry.id, 'resumed', {
      pauseDuration,
      pauseDurationMinutes: Math.floor(pauseDuration / (1000 * 60)),
      resumedAt: new Date().toISOString()
    });
  };

  const getElapsedTime = (timeEntry: TimeEntry | null = activeTimeEntry, applyLocalPauseState: boolean = true): string => {
    if (!timeEntry) return "00:00:00";
    
    const startTime = new Date(timeEntry.startTime).getTime();
    const now = Date.now();
    
    // Base elapsed time from start_time (the source of truth from database)
    let elapsedMs = now - startTime;
    
    // Only apply local pause state if this is the current user's active timer
    // This ensures all users see the same base elapsed time from the database
    if (applyLocalPauseState && activeTimeEntry && timeEntry.id === activeTimeEntry.id) {
      elapsedMs -= totalPausedTime;
      
      // If currently paused, subtract the current pause duration
      if (isTimerPaused && pausedAt) {
        elapsedMs -= (now - pausedAt.getTime());
      }
    }
    
    // Ensure elapsed time is never negative
    elapsedMs = Math.max(0, elapsedMs);
    
    const seconds = Math.floor((elapsedMs / 1000) % 60);
    const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateTimeEntryStatus = async (timeEntryId: string, status: string, reason?: string) => {
    const updates: Partial<TimeEntry> = { status: status as TimeEntryStatus };
    if (reason) {
      updates.rejectionReason = reason;
    }
    await updateTimeEntry(timeEntryId, updates);
  };

  // Team functions
  const addTeam = async (team: Omit<Team, 'id'>) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          auth_user_id: session.user.id,
          name: team.name,
          description: team.description,
          color: team.color
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding team:', error);
        return;
      }

      if (data) {
        const newTeam: Team = {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          memberIds: team.memberIds || [],
          leaderId: team.leaderId,
          color: data.color
        };
        setTeams(prev => [...prev, newTeam]);
      }
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.color !== undefined) dbUpdates.color = updates.color;

      const { error } = await supabase
        .from('teams')
        .update(dbUpdates)
        .eq('id', teamId);

      if (error) {
        console.error('Error updating team:', error);
        return;
      }

      setTeams(prev => prev.map(team => 
        team.id === teamId ? { ...team, ...updates } : team
      ));
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) {
        console.error('Error deleting team:', error);
        return;
      }

      setTeams(prev => prev.filter(team => team.id !== teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // Note functions
  const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          auth_user_id: session.user.id,
          user_id: note.userId,
          title: note.title,
          content: note.content,
          archived: note.archived || false
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding note:', error);
        return;
      }

      if (data) {
        const newNote: Note = {
          id: data.id,
          title: data.title,
          content: data.content || '',
          userId: data.user_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          archived: data.archived || false
        };
        setNotes(prev => [...prev, newNote]);
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', noteId);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }

      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const getNotesByUser = (userId: string): Note[] => {
    return notes.filter(note => note.userId === userId);
  };

  // Additional placeholder implementations for other functions
  const inviteUser = (email: string, name: string, role: string, options?: any) => {
    console.log('Invite user functionality not yet implemented');
  };

  const updateManagerNotificationPreferences = (preferences: any) => {
    console.log('Update manager notification preferences not yet implemented');
  };

  const convertProjectToTemplate = async (projectId: string, templateData: { name: string; description: string }) => {
    try {
      // Get the authenticated user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Find the project
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find tasks for this project
      const projectTasks = tasks.filter(t => t.projectId === projectId);

      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('project_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          service_type: project.serviceType,
          default_duration: 30,
          allocated_hours: project.allocatedHours || 0,
          auth_user_id: user.id, // Use the actual Supabase auth user ID
          team_ids: project.teamIds || [],
          usage_count: 0
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template tasks
      if (projectTasks.length > 0) {
        const templateTasks = projectTasks.map((task, index) => ({
          template_id: template.id,
          name: task.title,
          description: task.description || '',
          priority: task.priority,
          estimated_hours: task.estimatedHours || 0,
          order_index: index,
          auth_user_id: user.id // Use the actual Supabase auth user ID
        }));

        const { error: tasksError } = await supabase
          .from('project_template_tasks')
          .insert(templateTasks);

        if (tasksError) throw tasksError;
      }

      console.log('Template created successfully:', template);
      
      // Trigger a refresh of any template lists
      window.dispatchEvent(new CustomEvent('templateCreated'));
    } catch (error) {
      console.error('Error converting project to template:', error);
      throw error;
    }
  };

  const watchProject = (projectId: string, userId: string) => {
    console.log('Watch project not yet implemented');
  };

  const unwatchProject = (projectId: string, userId: string) => {
    console.log('Unwatch project not yet implemented');
  };

  const createProjectFromTemplate = async (templateId: string, projectData: any) => {
    if (!session?.user) return;

    try {
      // 1. Fetch the template
      const { data: templateData, error: templateError } = await supabase
        .from('project_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !templateData) {
        console.error('Error fetching template:', templateError);
        toast({ title: "Error", description: "Template not found", variant: "destructive" });
        return;
      }

      // 2. Create the project
      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .insert({
          auth_user_id: session.user.id,
          name: projectData.name,
          description: templateData.description || '',
          client_id: projectData.clientId,
          status: 'todo',
          service_type: templateData.service_type || 'project',
          start_date: projectData.startDate || null,
          due_date: projectData.dueDate || null,
          allocated_hours: templateData.allocated_hours || 0,
          used_hours: 0,
          team_ids: templateData.team_ids || [],
          collaborator_ids: projectData.memberIds || [],
        })
        .select()
        .single();

      if (projectError || !projectRow) {
        console.error('Error creating project from template:', projectError);
        toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
        return;
      }

      // Add to local state
      const newProject: Project = {
        id: projectRow.id,
        name: projectRow.name,
        description: projectRow.description,
        clientId: projectRow.client_id,
        status: (projectRow.status as 'todo' | 'in-progress' | 'done') || 'todo',
        serviceType: (projectRow.service_type as 'project' | 'bank-hours' | 'pay-as-you-go') || 'project',
        startDate: projectRow.start_date || undefined,
        dueDate: projectRow.due_date || undefined,
        allocatedHours: projectRow.allocated_hours || undefined,
        usedHours: projectRow.used_hours || 0,
        teamIds: projectRow.team_ids || [],
        watcherIds: projectRow.watcher_ids || [],
        ownerId: projectRow.owner_id || undefined,
        collaboratorIds: projectRow.collaborator_ids || [],
      };
      setProjects(prev => [...prev, newProject]);

      // 3. Fetch template tasks
      const { data: templateTasks, error: tasksError } = await supabase
        .from('project_template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (tasksError) {
        console.error('Error fetching template tasks:', tasksError);
      }

      // 4. Create tasks from template tasks
      if (templateTasks && templateTasks.length > 0) {
        // Fetch all subtasks for all template tasks at once
        const taskIds = templateTasks.map(t => t.id);
        const { data: allSubtasks } = await supabase
          .from('project_template_subtasks')
          .select('*')
          .in('template_task_id', taskIds)
          .order('order_index');

        // Group subtasks by template_task_id
        const subtasksByTaskId: Record<string, any[]> = {};
        (allSubtasks || []).forEach(subtask => {
          if (!subtasksByTaskId[subtask.template_task_id]) {
            subtasksByTaskId[subtask.template_task_id] = [];
          }
          subtasksByTaskId[subtask.template_task_id].push(subtask);
        });

        // Build all task inserts
        const taskInserts = templateTasks.map(templateTask => {
          const subtasks = subtasksByTaskId[templateTask.id] || [];
          const checklist = subtasks.map(subtask => ({
            id: crypto.randomUUID(),
            text: subtask.name,
            completed: false,
          }));

          return {
            auth_user_id: session.user.id,
            title: templateTask.name,
            description: templateTask.description || '',
            project_id: projectRow.id,
            status: 'backlog',
            priority: templateTask.priority || 'medium',
            estimated_hours: templateTask.estimated_hours || null,
            checklist: checklist.length > 0 ? checklist : [],
            order_index: templateTask.order_index,
          };
        });

        console.log('Inserting tasks from template:', taskInserts.length, taskInserts);

        const { data: createdTasks, error: batchError } = await supabase
          .from('tasks')
          .insert(taskInserts)
          .select();

        if (batchError) {
          console.error('Error batch creating tasks from template:', batchError);
          toast({ title: "Error", description: `Failed to create tasks: ${batchError.message}`, variant: "destructive" });
        } else {
          console.log('Successfully created tasks:', createdTasks?.length);
        }

        // Refresh tasks
        await loadTasks();
      }

      // 5. Increment usage count
      await supabase
        .from('project_templates')
        .update({ usage_count: (templateData.usage_count || 0) + 1 })
        .eq('id', templateId);

      toast({
        title: "Project created",
        description: `Project "${projectData.name}" created from template with ${templateTasks?.length || 0} tasks.`,
      });

    } catch (error) {
      console.error('Error creating project from template:', error);
      toast({ title: "Error", description: "Failed to create project from template", variant: "destructive" });
    }
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus as any });
  };

  const reorderTasks = async (taskId: string, newIndex: number, newStatus?: string) => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please log in to reorder tasks",
        variant: "destructive"
      });
      return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Determine the target status (use new status if provided, otherwise keep current)
    const targetStatus = newStatus || task.status;
    
    // Get all tasks in the target status
    const tasksInStatus = tasks
      .filter(t => t.status === targetStatus)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Remove the task being moved if it's in this status already
    const filteredTasks = tasksInStatus.filter(t => t.id !== taskId);
    
    // Insert the task at the new position
    filteredTasks.splice(newIndex, 0, task);

    // Update order_index for all affected tasks
    const updates = filteredTasks.map((t, index) => ({
      id: t.id,
      order_index: index,
      ...(t.id === taskId && newStatus ? { status: newStatus } : {})
    }));

    // Store previous state for rollback
    const previousTasks = [...tasks];

    // OPTIMISTIC UPDATE: Update local state immediately
    setTasks(prev => prev.map(t => {
      const update = updates.find(u => u.id === t.id);
      if (update) {
        return {
          ...t,
          orderIndex: update.order_index,
          ...(update.status ? { status: update.status as TaskStatus } : {})
        };
      }
      return t;
    }));

    // Background database update
    try {
      // Batch update in database
      for (const update of updates) {
        const { error } = await supabase
          .from('tasks')
          .update({ 
            order_index: update.order_index,
            ...(update.status ? { status: update.status } : {})
          })
          .eq('id', update.id);

        if (error) throw error;
      }
      
      // Send notification for task updates if status changed
      if (newStatus && newStatus !== task.status && task.projectId && session?.user?.id) {
        const eventType = newStatus === 'done' ? 'task_completed' : 'status_changed';
        console.log(`🔔 Sending ${eventType} notification for task:`, taskId);
        supabase.functions.invoke('send-task-notification', {
          body: {
            taskId,
            projectId: task.projectId,
            eventType,
            userId: session.user.id,
            oldStatus: task.status,
            newStatus: newStatus,
            changes: { status: newStatus }
          }
        }).then(({ error }) => {
          if (error) {
            console.error(`❌ Error sending ${eventType} notification:`, error);
          } else {
            console.log(`✅ ${eventType} notification sent successfully`);
          }
        });
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      // ROLLBACK: Restore previous state on error
      setTasks(previousTasks);
      toast({
        title: "Error",
        description: "Failed to reorder task. Changes have been reverted.",
        variant: "destructive"
      });
    }
  };

  const watchTask = (taskId: string, userId: string) => {
    console.log('Watch task not yet implemented');
  };

  const unwatchTask = (taskId: string, userId: string) => {
    console.log('Unwatch task not yet implemented');
  };

  const linkTasks = async (taskId: string, relatedTaskId: string) => {
    try {
      // Get current tasks to update their relatedTaskIds
      const task1 = tasks.find(t => t.id === taskId);
      const task2 = tasks.find(t => t.id === relatedTaskId);
      
      if (!task1 || !task2) return;
      
      // Update first task
      const task1RelatedIds = task1.relatedTaskIds || [];
      if (!task1RelatedIds.includes(relatedTaskId)) {
        await updateTask(taskId, { 
          relatedTaskIds: [...task1RelatedIds, relatedTaskId] 
        });
      }
      
      // Update second task
      const task2RelatedIds = task2.relatedTaskIds || [];
      if (!task2RelatedIds.includes(taskId)) {
        await updateTask(relatedTaskId, { 
          relatedTaskIds: [...task2RelatedIds, taskId] 
        });
      }
    } catch (error) {
      console.error('Error linking tasks:', error);
      throw error;
    }
  };

  const unlinkTasks = async (taskId: string, relatedTaskId: string) => {
    try {
      // Get current tasks to update their relatedTaskIds
      const task1 = tasks.find(t => t.id === taskId);
      const task2 = tasks.find(t => t.id === relatedTaskId);
      
      if (!task1 || !task2) return;
      
      // Update first task
      const task1RelatedIds = task1.relatedTaskIds || [];
      await updateTask(taskId, { 
        relatedTaskIds: task1RelatedIds.filter(id => id !== relatedTaskId) 
      });
      
      // Update second task  
      const task2RelatedIds = task2.relatedTaskIds || [];
      await updateTask(relatedTaskId, { 
        relatedTaskIds: task2RelatedIds.filter(id => id !== taskId) 
      });
    } catch (error) {
      console.error('Error unlinking tasks:', error);
      throw error;
    }
  };

  const uploadTaskFile = async (taskId: string, file: File): Promise<string> => {
    if (!session?.user) return '';
    
    try {
      // Create a unique file path
      const fileName = `tasks/${taskId}/${Date.now()}-${file.name}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL for the file
      const { data: publicUrlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(uploadData.path);

      // Create a task file record in task_files table
      const { data: fileData, error: fileError } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
          auth_user_id: session.user.id,
          name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          is_external_link: false
        })
        .select()
        .single();

      if (fileError) throw fileError;

      // Update local state
      if (fileData) {
        const newFile: TaskFile = {
          id: fileData.id,
          name: fileData.name,
          url: publicUrlData.publicUrl,
          size: file.size,
          sizeKb: Math.round(file.size / 1024),
          uploadedAt: fileData.uploaded_at,
          isExternalLink: false
        };

        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, files: [...(task.files || []), newFile] }
            : task
        ));
      }

      return uploadData.path;
    } catch (error) {
      console.error('Error uploading task file:', error);
      throw error;
    }
  };

  const addTaskExternalLink = async (taskId: string, linkName: string, linkUrl: string) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
          auth_user_id: session.user.id,
          name: linkName,
          external_url: linkUrl,
          is_external_link: true,
          mime_type: 'application/link'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding external link:', error);
        throw error;
      }

      if (data) {
        const newFile: TaskFile = {
          id: data.id,
          name: data.name,
          url: data.external_url || '',
          externalUrl: data.external_url || '',
          isExternalLink: true,
          size: 0,
          sizeKb: 0,
          uploadedAt: data.uploaded_at
        };

        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, files: [...(task.files || []), newFile] }
            : task
        ));
      }
    } catch (error) {
      console.error('Error adding external link:', error);
      throw error;
    }
  };

  const deleteTaskFile = async (taskId: string, fileId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Error deleting task file:', error);
        return;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, files: (task.files || []).filter(f => f.id !== fileId) }
          : task
      ));
    } catch (error) {
      console.error('Error deleting task file:', error);
    }
  };

  const addTaskStatus = async (status: Omit<TaskStatusDefinition, 'id'>) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('task_status_definitions')
        .insert({
          auth_user_id: session.user.id,
          name: status.label,
          value: status.value,
          color: status.color,
          order_index: status.order,
          is_final: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newStatus: TaskStatusDefinition = {
        id: data.id,
        label: data.name,
        value: status.value,
        color: data.color,
        order: data.order_index,
      };

      setTaskStatuses(prev => [...prev, newStatus]);
    } catch (error) {
      console.error('Error adding task status:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (statusId: string, updates: Partial<TaskStatusDefinition>) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const updateData: any = {};
      if (updates.label) updateData.name = updates.label;
      if (updates.value) updateData.value = updates.value;
      if (updates.color) updateData.color = updates.color;
      if (updates.order !== undefined) updateData.order_index = updates.order;

      const { error } = await supabase
        .from('task_status_definitions')
        .update(updateData)
        .eq('id', statusId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setTaskStatuses(prev => 
        prev.map(status => 
          status.id === statusId ? { ...status, ...updates } : status
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  };

  const deleteTaskStatus = async (statusId: string) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('task_status_definitions')
        .delete()
        .eq('id', statusId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setTaskStatuses(prev => prev.filter(status => status.id !== statusId));
    } catch (error) {
      console.error('Error deleting task status:', error);
      throw error;
    }
  };

  const reorderTaskStatuses = async (statuses: TaskStatusDefinition[]) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Update all statuses with new order
      const updates = statuses.map((status, index) => 
        supabase
          .from('task_status_definitions')
          .update({ order_index: index })
          .eq('id', status.id)
          .eq('auth_user_id', session.user.id)
      );

      await Promise.all(updates);
      setTaskStatuses(statuses);
    } catch (error) {
      console.error('Error reordering task statuses:', error);
      throw error;
    }
  };

  const addProjectStatus = async (status: Omit<ProjectStatusDefinition, 'id'>) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('project_status_definitions')
        .insert({
          auth_user_id: session.user.id,
          name: status.label,
          color: status.color,
          order_index: status.order,
          is_final: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newStatus: ProjectStatusDefinition = {
        id: data.id,
        label: data.name,
        value: status.value,
        color: data.color,
        order: data.order_index,
        isFinal: data.is_final || false,
      };

      setProjectStatuses(prev => [...prev, newStatus]);
    } catch (error) {
      console.error('Error adding project status:', error);
      throw error;
    }
  };

  const updateProjectStatus = async (statusId: string, updates: Partial<ProjectStatusDefinition>) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('project_status_definitions')
        .update({
          name: updates.label,
          color: updates.color,
          order_index: updates.order,
          is_final: updates.isFinal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', statusId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setProjectStatuses(prev => 
        prev.map(status => 
          status.id === statusId 
            ? { ...status, ...updates }
            : status
        )
      );
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  };

  const deleteProjectStatus = async (statusId: string) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('project_status_definitions')
        .delete()
        .eq('id', statusId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setProjectStatuses(prev => prev.filter(status => status.id !== statusId));
    } catch (error) {
      console.error('Error deleting project status:', error);
      throw error;
    }
  };

  const reorderProjectStatuses = async (statuses: ProjectStatusDefinition[]) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Update the order in the database for each status
      const updates = statuses.map((status, index) => 
        supabase
          .from('project_status_definitions')
          .update({ order_index: index })
          .eq('id', status.id)
          .eq('auth_user_id', session.user.id)
      );

      await Promise.all(updates);
      setProjectStatuses(statuses);
    } catch (error) {
      console.error('Error reordering project statuses:', error);
      throw error;
    }
  };

  // Comment functions
  const addComment = async (taskId: string, userId: string, content: string, mentionedUserIds?: string[], images?: string[]): Promise<string> => {
    if (!currentUser) throw new Error('No authenticated user');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('No authenticated session found when adding comment');
        throw new Error('No authenticated session');
      }

      console.log('Adding comment with data:', {
        task_id: taskId,
        auth_user_id: session.user.id,
        user_id: userId,
        content: content?.substring(0, 50),
        mentioned_user_ids: mentionedUserIds,
        images: images?.length
      });

      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          auth_user_id: session.user.id,
          user_id: userId,
          content,
          mentioned_user_ids: mentionedUserIds || [],
          images: images || []
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding comment:', error);
        throw error;
      }

      const newComment = {
        id: data.id,
        userId: data.user_id,
        content: data.content,
        timestamp: data.created_at,
        mentionedUserIds: data.mentioned_user_ids || [],
        images: (data as any).images || []
      };

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              comments: [...(task.comments || []), newComment]
            }
          : task
      ));

      // Send Google Chat notification for the comment
      // Fetch the task's project_id directly from DB to avoid stale state issues
      const { data: taskData } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', taskId)
        .single();
      
      if (taskData?.project_id) {
        console.log('🔔 Sending task_commented notification for task:', taskId, 'project:', taskData.project_id);
        supabase.functions.invoke('send-task-notification', {
          body: {
            taskId,
            projectId: taskData.project_id,
            eventType: 'task_commented',
            userId: session.user.id,
            commentContent: content
          }
        }).then(({ error }) => {
          if (error) {
            console.error('❌ Error sending comment notification:', error);
          } else {
            console.log('✅ Comment notification sent successfully');
          }
        });
      } else {
        console.log('⚠️ Could not find project for task:', taskId);
      }

      return data.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const updateComment = async (commentId: string, taskId: string, content: string): Promise<void> => {
    if (!currentUser) throw new Error('No authenticated user');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('No authenticated session found when updating comment');
        throw new Error('No authenticated session');
      }

      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('comments')
        .update({
          content,
          updated_at: now
        })
        .eq('id', commentId)
        .eq('auth_user_id', session.user.id); // Ensure user can only edit their own comments

      if (error) {
        console.error('Supabase error updating comment:', error);
        throw error;
      }

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              comments: (task.comments || []).map(comment =>
                comment.id === commentId
                  ? { ...comment, content, edited: true, editedAt: now }
                  : comment
              )
            }
          : task
      ));
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  // Message functions
  const addMessage = async (message: Omit<Message, 'id'>) => {
    try {
      // For each recipient, create a separate database record
      const insertPromises = message.recipientIds.map(async (recipientId) => {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            from_user_id: message.senderId,
            to_user_id: recipientId,
            content: message.content,
            subject: message.content.substring(0, 50), // Use first 50 chars as subject
            timestamp: message.timestamp || new Date().toISOString(),
            read: false,
            auth_user_id: session?.user?.id || message.senderId,
            task_id: message.taskId,
            project_id: message.projectId
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      const insertedMessages = await Promise.all(insertPromises);
      
      // Convert back to Message format and add to local state
      const convertedMessages: Message[] = insertedMessages.map((dbMsg: any) => ({
        id: dbMsg.id,
        senderId: dbMsg.from_user_id,
        recipientIds: [dbMsg.to_user_id],
        content: dbMsg.content,
        timestamp: dbMsg.timestamp,
        read: dbMsg.read,
        taskId: dbMsg.task_id,
        projectId: dbMsg.project_id
      }));

      setMessages(prev => [...prev, ...convertedMessages]);
      return insertedMessages[0].id; // Return first message ID
    } catch (error) {
      console.error('Error adding message:', error);
      // Fallback to local state only
      const newMessage: Message = {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setMessages(prev => [...prev, newMessage]);
      return newMessage.id;
    }
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const sendMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    return await addMessage({
      ...message,
      timestamp: new Date().toISOString(),
      read: false
    });
  };

  const createMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    return await addMessage({
      ...message,
      timestamp: new Date().toISOString(),
      read: false
    });
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      // Update database first to ensure persistence
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error marking message as read in database:', error);
        return;
      }

      // Update local state only after successful database update
      updateMessage(messageId, { read: true });
      console.log('✅ Message marked as read:', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Custom Role functions
  const addCustomRole = async (role: Omit<CustomRole, 'id'>) => {
    if (!session?.user) {
      console.error('No session available for adding custom role');
      return;
    }
    
    try {
      console.log('Adding custom role:', role.name);
      const { data, error } = await supabase
        .from('custom_roles')
        .insert({
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          color: role.color,
          auth_user_id: session.user.id
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding custom role:', error);
        return;
      }
      
      const newRole: CustomRole = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        permissions: safeParseJson(data.permissions, {}),
        color: data.color
      };
      
      setCustomRoles(prev => [...prev, newRole]);
      console.log('Custom role added successfully:', newRole.name);
    } catch (error) {
      console.error('Error adding custom role:', error);
    }
  };

  const updateCustomRole = async (roleId: string, updates: Partial<CustomRole>) => {
    if (!session?.user) {
      console.error('No session available for updating custom role');
      return;
    }
    
    try {
      console.log('Updating custom role:', roleId);
      const { data, error } = await supabase
        .from('custom_roles')
        .update({
          name: updates.name,
          description: updates.description,
          permissions: updates.permissions,
          color: updates.color,
        })
        .eq('id', roleId)
        .eq('auth_user_id', session.user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating custom role:', error);
        return;
      }
      
      const updatedRole: CustomRole = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        permissions: safeParseJson(data.permissions, {}),
        color: data.color
      };
      
      setCustomRoles(prev => prev.map(role => 
        role.id === roleId ? updatedRole : role
      ));
      console.log('Custom role updated successfully:', updatedRole.name);
    } catch (error) {
      console.error('Error updating custom role:', error);
    }
  };

  const deleteCustomRole = async (roleId: string) => {
    if (!session?.user) {
      console.error('No session available for deleting custom role');
      return;
    }
    
    try {
      console.log('Deleting custom role:', roleId);
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId)
        .eq('auth_user_id', session.user.id);
      
      if (error) {
        console.error('Error deleting custom role:', error);
        return;
      }
      
      setCustomRoles(prev => prev.filter(role => role.id !== roleId));
      console.log('Custom role deleted successfully');
    } catch (error) {
      console.error('Error deleting custom role:', error);
    }
  };

  // Template functions
  const addProjectTemplate = async (template: Omit<ProjectTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    if (!currentUser) return;

    try {
      // Get current session to use the correct auth user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('No session found');
        return;
      }

      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          auth_user_id: session.user.id,
          name: template.name,
          description: template.description,
          service_type: template.serviceType,
          default_duration: template.defaultDuration,
          allocated_hours: template.allocatedHours,
          custom_fields: template.customFields,
          team_ids: template.teamIds,
          tags: template.tags || [],
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newTemplate: ProjectTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        serviceType: data.service_type as 'project' | 'bank-hours' | 'pay-as-you-go',
        defaultDuration: data.default_duration,
        allocatedHours: data.allocated_hours,
        customFields: data.custom_fields || [],
        teamIds: data.team_ids || [],
        tags: data.tags || [],
        tasks: [],
        createdAt: data.created_at,
        createdBy: template.createdBy,
        usageCount: data.usage_count,
      };

      setProjectTemplates(prev => [newTemplate, ...prev]);
    } catch (error) {
      console.error('Error adding project template:', error);
      throw error;
    }
  };

  const updateProjectTemplate = async (templateId: string, updates: Partial<ProjectTemplate>) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('project_templates')
        .update({
          name: updates.name,
          description: updates.description,
          service_type: updates.serviceType,
          default_duration: updates.defaultDuration,
          allocated_hours: updates.allocatedHours,
          custom_fields: updates.customFields,
          team_ids: updates.teamIds,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setProjectTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, ...updates }
            : template
        )
      );
    } catch (error) {
      console.error('Error updating project template:', error);
      throw error;
    }
  };

  const deleteProjectTemplate = async (templateId: string) => {
    if (!currentUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', templateId)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      setProjectTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (error) {
      console.error('Error deleting project template:', error);
      throw error;
    }
  };

  // Purchase functions
  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    console.log('Add purchase not yet implemented');
  };

  const updatePurchase = (purchaseId: string, updates: Partial<Purchase>) => {
    console.log('Update purchase not yet implemented');
  };

  const deletePurchase = (purchaseId: string) => {
    console.log('Delete purchase not yet implemented');
  };

  // Client Agreement functions
  const addClientAgreement = (agreement: any) => {
    console.log('Add client agreement not yet implemented');
  };

  const updateClientAgreement = (agreementId: string, updates: any) => {
    console.log('Update client agreement not yet implemented');
  };

  const deleteClientAgreement = (agreementId: string) => {
    console.log('Delete client agreement not yet implemented');
  };

  const getClientAgreements = (clientId: string) => {
    console.log('Get client agreements not yet implemented');
    return [];
  };

  // Client File functions
  const uploadClientFile = async (clientId: string, file: File): Promise<void> => {
    console.log('Upload client file not yet implemented');
  };

  const deleteClientFile = (fileId: string) => {
    console.log('Delete client file not yet implemented');
  };

  const getClientFiles = (clientId: string) => {
    console.log('Get client files not yet implemented');
    return [];
  };

  // Custom Field functions
  const addCustomField = (field: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Add custom field not yet implemented');
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    console.log('Update custom field not yet implemented');
  };

  const deleteCustomField = (fieldId: string) => {
    console.log('Delete custom field not yet implemented');
  };

  const reorderCustomFields = (fields: CustomField[]) => {
    console.log('Reorder custom fields not yet implemented');
  };

  // Dashboard and Report functions
  const addCustomDashboard = (dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDashboard: CustomDashboard = {
      ...dashboard,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomDashboards(prev => [...prev, newDashboard]);
  };

  const updateCustomDashboard = (dashboardId: string, updates: Partial<CustomDashboard>) => {
    setCustomDashboards(prev => 
      prev.map(dashboard => 
        dashboard.id === dashboardId 
          ? { ...dashboard, ...updates, updatedAt: new Date().toISOString() }
          : dashboard
      )
    );
  };

  const deleteCustomDashboard = (dashboardId: string) => {
    setCustomDashboards(prev => prev.filter(dashboard => dashboard.id !== dashboardId));
    // Also remove any reports that were only in this dashboard
    setSavedReports(prev => prev.filter(report => 
      customDashboards.some(d => d.id !== dashboardId && d.reportIds.includes(report.id))
    ));
  };

  const setDefaultDashboard = (dashboardId: string) => {
    setCustomDashboards(prev => 
      prev.map(dashboard => ({
        ...dashboard,
        isDefault: dashboard.id === dashboardId,
        updatedAt: new Date().toISOString()
      }))
    );
  };

  const saveReport = (report: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt'>, dashboardId: string) => {
    const newReport: SavedReport = {
      ...report,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSavedReports(prev => [...prev, newReport]);
    
    // Add report to dashboard
    updateCustomDashboard(dashboardId, {
      reportIds: [...(customDashboards.find(d => d.id === dashboardId)?.reportIds || []), newReport.id]
    });
  };

  const updateSavedReport = (reportId: string, updates: Partial<SavedReport>) => {
    setSavedReports(prev => 
      prev.map(report => 
        report.id === reportId 
          ? { ...report, ...updates, updatedAt: new Date().toISOString() }
          : report
      )
    );
  };

  const deleteSavedReport = (reportId: string) => {
    setSavedReports(prev => prev.filter(report => report.id !== reportId));
    // Remove report from all dashboards
    setCustomDashboards(prev => 
      prev.map(dashboard => ({
        ...dashboard,
        reportIds: dashboard.reportIds.filter(id => id !== reportId),
        updatedAt: new Date().toISOString()
      }))
    );
  };

  const value: AppContextType = {
    currentUser,
    session,
    users,
    teams,
    clients,
    projects,
    tasks,
    timeEntries,
    messages,
    purchases,
    projectTemplates,
    taskTemplates,
    customRoles,
    comments,
    notes,
    customFields,
    activeTimeEntry,
    pausedTimeEntries,
    isTimerPaused,
    pausedAt,
    totalPausedTime,
    taskLogs,
    taskStatuses,
    projectStatuses,
    customDashboards,
    savedReports,
    
    login,
    logout,
    
    // User functions
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    inviteUser,
    updateManagerNotificationPreferences,
    
    // Team functions
    addTeam,
    updateTeam,
    deleteTeam,
    
    // Client functions
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    
    // Project functions
    addProject,
    updateProject,
    deleteProject,
    getProjectById,
    convertProjectToTemplate,
    watchProject,
    unwatchProject,
    createProjectFromTemplate,
    
    // Task functions
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
    moveTask,
    watchTask,
    unwatchTask,
    linkTasks,
    unlinkTasks,
    uploadTaskFile,
    addTaskExternalLink,
    deleteTaskFile,
    
    // Task Status functions
    addTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    reorderTaskStatuses,
    
    // Project Status functions
    addProjectStatus,
    updateProjectStatus,
    deleteProjectStatus,
    reorderProjectStatuses,
    
    // TimeEntry functions
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimeTracking,
    stopTimeTracking,
    pauseTimeTracking,
    resumeTimeTracking,
    getElapsedTime,
    updateTimeEntryStatus,
    
    // Message functions
    addMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    createMessage,
    markMessageAsRead,
    
    // Comment functions
    addComment,
    updateComment,
    
    // Note functions
    addNote,
    updateNote,
    deleteNote,
    getNotesByUser,
    
    // Custom Role functions
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    
    // Template functions
    addProjectTemplate,
    updateProjectTemplate,
    deleteProjectTemplate,
    refreshTaskTemplates: loadTaskTemplates,
    
    // Purchase functions
    addPurchase,
    updatePurchase,
    deletePurchase,
    
    // Client Agreement functions
    addClientAgreement,
    updateClientAgreement,
    deleteClientAgreement,
    getClientAgreements,
    
    // Client File functions
    uploadClientFile,
    deleteClientFile,
    getClientFiles,
    
    // Custom Field functions
    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
    
    // Dashboard and Report functions
    addCustomDashboard,
    updateCustomDashboard,
    deleteCustomDashboard,
    setDefaultDashboard,
    saveReport,
    updateSavedReport,
    deleteSavedReport,
    
    // Task reordering
    reorderTasks,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
