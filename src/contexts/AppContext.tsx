import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppContextType } from './AppContextType';
import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole, Note, TaskLog, TaskStatusDefinition, ProjectStatusDefinition, CustomField, TaskStatus, TimeEntryStatus } from "@/types";
import { CustomDashboard, SavedReport } from "@/types/dashboard";
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { mockUsers, mockTeams, mockClients, mockProjects, mockTasks, mockTimeEntries, mockMessages, mockPurchases, mockProjectTemplates, mockTaskTemplates, mockCustomRoles, mockCustomFields, mockDashboards } from "@/data/mockData";

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
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>([
    { id: '1', label: 'Backlog', value: 'backlog', color: 'bg-gray-500', order: 0 },
    { id: '2', label: 'To Do', value: 'todo', color: 'bg-blue-500', order: 1 },
    { id: '3', label: 'In Progress', value: 'in-progress', color: 'bg-yellow-500', order: 2 },
    { id: '4', label: 'Review', value: 'review', color: 'bg-orange-500', order: 3 },
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
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      avatar: dbUser.avatar || undefined,
      roleId: dbUser.role_id || dbUser.role || "user-role",
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
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) {
        console.error('Error loading users:', error);
        return;
      }
      
      console.log('🔍 Raw DB data:', data);
      const convertedUsers = data?.map(convertDbUserToUser) || [];
      console.log('🔍 Converted users:', convertedUsers.length);
      setUsers(convertedUsers);
      
      // Set current user based on auth_user_id match from raw DB data
      const sessionUserDb = data?.find((dbUser: any) => dbUser.auth_user_id === session.user.id);
      console.log('🔍 Looking for user with auth_user_id:', session.user.id);
      console.log('🔍 Available DB users:', data?.map((dbUser: any) => ({ 
        id: dbUser.id, 
        auth_user_id: dbUser.auth_user_id, 
        email: dbUser.email, 
        name: dbUser.name 
      })));
      console.log('🔍 Found session user in DB:', sessionUserDb ? sessionUserDb.name : 'NOT FOUND');
      
      if (sessionUserDb) {
        const sessionUser = convertDbUserToUser(sessionUserDb);
        console.log('✅ Current user set:', sessionUser.name);
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
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) {
        console.error('Error loading clients:', error);
        return;
      }
      
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
      
      setClients(convertedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
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
        collaboratorIds: project.collaborator_ids || []
      })) || [];
      
      setProjects(convertedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*');
      
      if (error) {
        console.error('Error loading tasks:', error);
        return;
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
        comments: task.comments || [],
        collaboratorIds: task.collaborator_ids || []
      })) || [];
      
      setTasks(convertedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*');
      
      if (error) {
        console.error('Error loading time entries:', error);
        return;
      }
      
      const convertedTimeEntries = data?.map((entry: any) => ({
        id: entry.id,
        userId: entry.user_id,
        taskId: entry.task_id || '',
        projectId: entry.project_id || undefined,
        clientId: entry.client_id || undefined,
        startTime: entry.start_time,
        endTime: entry.end_time || undefined,
        duration: entry.duration || 0,
        description: entry.notes || undefined,
        status: (entry.status as TimeEntryStatus) || 'pending',
        notes: entry.notes || undefined,
        rejectionReason: entry.rejection_reason || undefined
      })) || [];
      
      setTimeEntries(convertedTimeEntries);
      
      // Find active time entry (one without end_time)
      const activeEntry = convertedTimeEntries.find(entry => !entry.endTime);
      setActiveTimeEntry(activeEntry || null);
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

  // Load all data when session is available
  useEffect(() => {
    if (session?.user) {
      console.log('🔍 Session available, loading data...');
      console.log('🔍 Session user email:', session.user.email);
      console.log('🔍 Session user ID:', session.user.id);
      // Use setTimeout to prevent potential auth deadlocks
      setTimeout(() => {
        loadUsers();
        loadClients();
        loadProjects();
        loadTasks();
        loadTimeEntries();
        loadTeams();
        loadNotes();
        loadProjectStatuses();
        loadCustomRoles();
        loadTaskTemplates();
        loadProjectTemplates();
        initializeDefaultDashboard();
      }, 100);
    } else {
      console.log('🔍 No session available');
    }
  }, [session]);

  // Authentication setup with better session handling
  useEffect(() => {
    console.log('Setting up auth listener');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('Initial session:', initialSession?.user?.email || 'No session');
      setSession(initialSession);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email || 'No session');
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
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: session.user.id,
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
          guest_permissions: user.guest_permissions ? JSON.stringify(user.guest_permissions) : null
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
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.roleId !== undefined) dbUpdates.role = updates.roleId;
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

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return;
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
  };

  // Client functions
  const addClient = async (client: Omit<Client, 'id'>) => {
    if (!session?.user) return;
    
    try {
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
          collaboratorIds: data.collaborator_ids || []
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

  const deleteProject = async (projectId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return;
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const getProjectById = (projectId: string): Project | undefined => {
    return projects.find(project => project.id === projectId);
  };

  // Task functions
  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'timeEntries' | 'comments'>) => {
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          auth_user_id: session.user.id,
          title: task.title,
          description: task.description,
          project_id: task.projectId,
          assignee_id: task.assigneeId,
          status: task.status,
          priority: task.priority,
          due_date: task.dueDate,
          estimated_hours: task.estimatedHours,
          actual_hours: task.actualHours,
          watcher_ids: task.watcherIds || [],
          collaborator_ids: task.collaboratorIds || []
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding task:', error);
        return;
      }

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
          collaboratorIds: data.collaborator_ids || []
        };
        setTasks(prev => [...prev, newTask]);
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
      if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
      if (updates.actualHours !== undefined) dbUpdates.actual_hours = updates.actualHours;
      if (updates.watcherIds !== undefined) dbUpdates.watcher_ids = updates.watcherIds;
      if (updates.comments !== undefined) dbUpdates.comments = updates.comments;
      if (updates.collaboratorIds !== undefined) dbUpdates.collaborator_ids = updates.collaboratorIds;

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        return;
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  // Time Entry functions
  const addTimeEntry = async (timeEntry: Omit<TimeEntry, 'id'>) => {
    if (!session?.user) return;
    
    try {
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
          rejection_reason: timeEntry.rejectionReason
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
          rejectionReason: data.rejection_reason || undefined
        };
        setTimeEntries(prev => [...prev, newTimeEntry]);
      }
    } catch (error) {
      console.error('Error adding time entry:', error);
    }
  };

  const updateTimeEntry = async (timeEntryId: string, updates: Partial<TimeEntry>) => {
    if (!session?.user) return;
    
    try {
      const dbUpdates: any = {};
      
      if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
      if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.description !== undefined) dbUpdates.notes = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

      const { error } = await supabase
        .from('time_entries')
        .update(dbUpdates)
        .eq('id', timeEntryId);

      if (error) {
        console.error('Error updating time entry:', error);
        return;
      }

      setTimeEntries(prev => prev.map(entry => 
        entry.id === timeEntryId ? { ...entry, ...updates } : entry
      ));

      // Update active time entry if it's the one being updated
      if (activeTimeEntry?.id === timeEntryId) {
        setActiveTimeEntry(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const deleteTimeEntry = async (timeEntryId: string) => {
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', timeEntryId);

      if (error) {
        console.error('Error deleting time entry:', error);
        return;
      }

      setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
      
      // Clear active time entry if it was deleted
      if (activeTimeEntry?.id === timeEntryId) {
        setActiveTimeEntry(null);
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const startTimeTracking = async (taskId?: string, projectId?: string, clientId?: string) => {
    if (!session?.user || !currentUser) return;
    
    console.log('🚀 Starting new timer - Initial state:', {
      activeTimeEntry: activeTimeEntry?.id,
      isTimerPaused,
      totalPausedTime,
      pausedAt
    });
    
    // Don't clear activeTimeEntry immediately - let the new timer creation handle the transition
    // This allows TimerBox to properly pause the existing timer before the new one takes over
    console.log('🔄 Starting new timer (existing timer will be paused by TimerBox when new timer becomes active)');

    const startTime = new Date().toISOString();
    console.log('⏰ Creating new timer entry with start time:', startTime);
    
    const newTimeEntry: Omit<TimeEntry, 'id'> = {
      userId: currentUser.id,
      taskId: taskId || undefined,
      projectId,
      clientId,
      startTime,
      duration: 0,
      status: 'pending'
    };

    await addTimeEntry(newTimeEntry);
    await loadTimeEntries(); // Reload to get the new active entry
    
    console.log('✅ New timer should be active now');
  };

  const stopTimeTracking = async (notes?: string) => {
    if (!activeTimeEntry) return;
    
    const endTime = new Date().toISOString();
    const startTime = new Date(activeTimeEntry.startTime);
    let duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / (1000 * 60)); // duration in minutes
    
    // Subtract total paused time from duration
    duration = Math.max(0, duration - Math.floor(totalPausedTime / (1000 * 60)));
    
    await updateTimeEntry(activeTimeEntry.id, {
      endTime,
      duration,
      description: notes
    });
    
    setActiveTimeEntry(null);
    setIsTimerPaused(false);
    setPausedAt(null);
    setTotalPausedTime(0);
  };

  const pauseTimeTracking = () => {
    if (!activeTimeEntry || isTimerPaused) return;
    
    setIsTimerPaused(true);
    setPausedAt(new Date());
    console.log('⏸️ Timer paused in AppContext');
  };

  const resumeTimeTracking = () => {
    if (!activeTimeEntry || !isTimerPaused || !pausedAt) return;
    
    const pauseDuration = Date.now() - pausedAt.getTime();
    setTotalPausedTime(prev => prev + pauseDuration);
    setIsTimerPaused(false);
    setPausedAt(null);
    console.log('▶️ Timer resumed in AppContext');
  };

  const getElapsedTime = (timeEntry: TimeEntry | null = activeTimeEntry): string => {
    if (!timeEntry) return "00:00:00";
    
    const startTime = new Date(timeEntry.startTime).getTime();
    const now = Date.now();
    let elapsedMs = now - startTime - totalPausedTime;
    
    console.log('⏱️ getElapsedTime calculation:', {
      timeEntryId: timeEntry.id,
      startTime: timeEntry.startTime,
      totalPausedTime,
      elapsedMs,
      isTimerPaused,
      pausedAt: pausedAt?.toISOString()
    });
    
    // If currently paused, subtract the current pause duration
    if (isTimerPaused && pausedAt) {
      elapsedMs -= (now - pausedAt.getTime());
    }
    
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

  const createProjectFromTemplate = (templateId: string, projectData: any) => {
    console.log('Create project from template not yet implemented');
  };

  const moveTask = (taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus as any });
  };

  const watchTask = (taskId: string, userId: string) => {
    console.log('Watch task not yet implemented');
  };

  const unwatchTask = (taskId: string, userId: string) => {
    console.log('Unwatch task not yet implemented');
  };

  const linkTasks = (taskId: string, relatedTaskId: string) => {
    console.log('Link tasks not yet implemented');
  };

  const unlinkTasks = (taskId: string, relatedTaskId: string) => {
    console.log('Unlink tasks not yet implemented');
  };

  const uploadTaskFile = async (taskId: string, file: File): Promise<string> => {
    console.log('Upload task file not yet implemented');
    return '';
  };

  const deleteTaskFile = (taskId: string, fileId: string) => {
    console.log('Delete task file not yet implemented');
  };

  const addTaskStatus = (status: Omit<TaskStatusDefinition, 'id'>) => {
    const newStatus = {
      ...status,
      id: Math.random().toString(36).substring(2, 15),
    };
    setTaskStatuses(prev => [...prev, newStatus]);
  };

  const updateTaskStatus = (statusId: string, updates: Partial<TaskStatusDefinition>) => {
    setTaskStatuses(prev => 
      prev.map(status => 
        status.id === statusId ? { ...status, ...updates } : status
      )
    );
  };

  const deleteTaskStatus = (statusId: string) => {
    setTaskStatuses(prev => prev.filter(status => status.id !== statusId));
  };

  const reorderTaskStatuses = (statuses: TaskStatusDefinition[]) => {
    setTaskStatuses(statuses);
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
  const addComment = (taskId: string, userId: string, content: string, mentionedUserIds?: string[]): string => {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const newComment = {
      id: commentId,
      userId,
      content,
      timestamp,
      mentionedUserIds: mentionedUserIds || []
    };

    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            comments: [...(task.comments || []), newComment]
          }
        : task
    ));

    return commentId;
  };

  // Message functions
  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const sendMessage = (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    addMessage({
      ...message,
      timestamp: new Date().toISOString(),
      read: false
    });
  };

  const createMessage = (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    addMessage({
      ...message,
      timestamp: new Date().toISOString(),
      read: false
    });
  };

  const markMessageAsRead = (messageId: string) => {
    updateMessage(messageId, { read: true });
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
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
