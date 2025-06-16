import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { AppContextType } from "./AppContextType";
import { User, Team, Client, Project, Task, TimeEntry, TimeEntryStatus, Message, Purchase, ProjectTemplate, CustomRole, Note, TaskLog, ClientAgreement, ClientFile, TaskStatus, TaskStatusDefinition, ProjectStatusDefinition, CustomField, CustomFieldType } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusDefinition[]>([]);

  // Load data from database functions
  const loadClients = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error loading clients:', error);
        return;
      }

      if (data) {
        const mappedClients: Client[] = data.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || '',
          address: client.address || '',
          website: client.website || '',
          status: client.status as 'active' | 'inactive',
          createdAt: client.created_at,
        }));
        
        setClients(mappedClients);
      }
    } catch (error) {
      console.error('Error in loadClients:', error);
    }
  };

  const loadUsers = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      if (data) {
        const mappedUsers: User[] = data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role as 'admin' | 'manager' | 'developer' | 'client',
          teamIds: user.team_ids || [],
          jobTitle: user.job_title,
          clientId: user.client_id,
          phone: user.phone,
          employmentType: user.employment_type as 'full-time' | 'part-time' | 'contract',
          billingType: user.billing_type as 'hourly' | 'monthly',
          hourlyRate: user.hourly_rate ? Number(user.hourly_rate) : undefined,
          monthlyRate: user.monthly_rate ? Number(user.monthly_rate) : undefined,
          billingRate: user.billing_rate ? Number(user.billing_rate) : undefined,
          currency: user.currency,
          clientRole: user.client_role,
          permissions: user.permissions || {},
          managerId: user.manager_id,
          notificationPreferences: user.notification_preferences || {},
          is_guest: user.is_guest,
          guest_of_user_id: user.guest_of_user_id,
          guest_permissions: user.guest_permissions || {},
        }));
        
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Error in loadUsers:', error);
    }
  };

  const loadProjects = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error loading projects:', error);
        return;
      }

      if (data) {
        const mappedProjects: Project[] = data.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          clientId: project.client_id,
          status: project.status as 'todo' | 'in-progress' | 'done',
          serviceType: project.service_type as 'project' | 'bank-hours' | 'pay-as-you-go',
          startDate: project.start_date,
          dueDate: project.due_date,
          allocatedHours: project.allocated_hours || 0,
          usedHours: project.used_hours || 0,
          teamIds: project.team_ids || [],
          watcherIds: project.watcher_ids || [],
        }));
        
        setProjects(mappedProjects);
      }
    } catch (error) {
      console.error('Error in loadProjects:', error);
    }
  };

  const loadTasks = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error loading tasks:', error);
        return;
      }

      if (data) {
        const mappedTasks: Task[] = data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          projectId: task.project_id,
          assigneeId: task.assignee_id,
          status: task.status as TaskStatus,
          priority: task.priority as 'low' | 'medium' | 'high',
          dueDate: task.due_date,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours || 0,
          watcherIds: task.watcher_ids || [],
          createdAt: task.created_at,
          timeEntries: [],
          comments: [],
        }));
        
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error in loadTasks:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error loading time entries:', error);
        return;
      }

      if (data) {
        const mappedTimeEntries: TimeEntry[] = data.map(entry => ({
          id: entry.id,
          userId: entry.user_id,
          taskId: entry.task_id,
          projectId: entry.project_id,
          clientId: entry.client_id,
          startTime: entry.start_time,
          endTime: entry.end_time,
          duration: entry.duration || 0,
          notes: entry.notes,
          status: entry.status as TimeEntryStatus,
          rejectionReason: entry.rejection_reason,
        }));
        
        setTimeEntries(mappedTimeEntries);
        
        // Check for active time entry (one without end_time)
        const activeEntry = mappedTimeEntries.find(entry => !entry.endTime);
        if (activeEntry) {
          setActiveTimeEntry(activeEntry);
        }
      }
    } catch (error) {
      console.error('Error in loadTimeEntries:', error);
    }
  };

  const loadNotes = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notes:', error);
        return;
      }

      if (data) {
        const mappedNotes: Note[] = data.map(note => ({
          id: note.id,
          userId: note.user_id,
          title: note.title,
          content: note.content || '',
          archived: note.archived || false,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        }));
        
        setNotes(mappedNotes);
      }
    } catch (error) {
      console.error('Error in loadNotes:', error);
    }
  };

  // Load custom fields from Supabase
  const loadCustomFields = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .order('field_order', { ascending: true });

      if (error) {
        console.error('Error loading custom fields:', error);
        return;
      }

      if (data) {
        const mappedFields: CustomField[] = data.map(field => ({
          id: field.id,
          name: field.name,
          type: field.type as CustomFieldType,
          description: field.description || '',
          required: field.required,
          applicableTo: field.applicable_to as ('projects' | 'tasks')[],
          options: field.options || [],
          defaultValue: field.default_value,
          order: field.field_order,
          createdAt: field.created_at,
          updatedAt: field.updated_at,
          reportable: field.reportable
        }));
        
        console.log('Loading custom fields from database:', mappedFields);
        setCustomFields(mappedFields);
      }
    } catch (error) {
      console.error('Error in loadCustomFields:', error);
    }
  };

  // Authentication functions
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        return false;
      }

      setSession(data.session);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error.message);
        return false;
      }
      setSession(null);
      setCurrentUser(null);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  };

  // User functions
  const addUser = async (user: Omit<User, "id">) => {
    if (!session?.user?.id) {
      console.error('No authenticated user');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: session.user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          team_ids: user.teamIds || [],
          job_title: user.jobTitle,
          client_id: user.clientId,
          phone: user.phone,
          employment_type: user.employmentType,
          billing_type: user.billingType,
          hourly_rate: user.hourlyRate,
          monthly_rate: user.monthlyRate,
          billing_rate: user.billingRate,
          currency: user.currency || 'USD',
          client_role: user.clientRole,
          permissions: user.permissions || {},
          manager_id: user.managerId,
          notification_preferences: user.notificationPreferences || {},
          is_guest: user.is_guest,
          guest_of_user_id: user.guest_of_user_id,
          guest_permissions: user.guest_permissions || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding user:', error);
        return;
      }

      if (data) {
        const newUser: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          role: data.role as 'admin' | 'manager' | 'developer' | 'client',
          teamIds: data.team_ids || [],
          jobTitle: data.job_title,
          clientId: data.client_id,
          phone: data.phone,
          employmentType: data.employment_type as 'full-time' | 'part-time' | 'contract',
          billingType: data.billing_type as 'hourly' | 'monthly',
          hourlyRate: data.hourly_rate ? Number(data.hourly_rate) : undefined,
          monthlyRate: data.monthly_rate ? Number(data.monthly_rate) : undefined,
          billingRate: data.billing_rate ? Number(data.billing_rate) : undefined,
          currency: data.currency,
          clientRole: data.client_role,
          permissions: data.permissions || {},
          managerId: data.manager_id,
          notificationPreferences: data.notification_preferences || {},
          is_guest: data.is_guest,
          guest_of_user_id: data.guest_of_user_id,
          guest_permissions: data.guest_permissions || {},
        };
        
        setUsers([...users, newUser]);
      }
    } catch (error) {
      console.error('Error in addUser:', error);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          email: updates.email,
          avatar: updates.avatar,
          role: updates.role,
          team_ids: updates.teamIds,
          job_title: updates.jobTitle,
          client_id: updates.clientId,
          phone: updates.phone,
          employment_type: updates.employmentType,
          billing_type: updates.billingType,
          hourly_rate: updates.hourlyRate,
          monthly_rate: updates.monthlyRate,
          billing_rate: updates.billingRate,
          currency: updates.currency,
          client_role: updates.clientRole,
          permissions: updates.permissions,
          manager_id: updates.managerId,
          notification_preferences: updates.notificationPreferences,
          is_guest: updates.is_guest,
          guest_of_user_id: updates.guest_of_user_id,
          guest_permissions: updates.guest_permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      setUsers(users.map((user) => (user.id === userId ? { ...user, ...updates } : user)));
    } catch (error) {
      console.error('Error in updateUser:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting user:', error);
        return;
      }

      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Error in deleteUser:', error);
    }
  };

  const getUserById = (userId: string) => {
    return users.find((user) => user.id === userId);
  };

  const inviteUser = (email: string, name: string, role: string, options?: any) => {
    // Implementation would involve sending an invitation email
    console.log(`Inviting ${email} as ${role}`);
    toast.success(`Invitation sent to ${email}`);
  };

  const updateManagerNotificationPreferences = (preferences: any) => {
    if (!currentUser) return;
    updateUser(currentUser.id, {
      notificationPreferences: {
        ...currentUser.notificationPreferences,
        ...preferences,
      },
    });
  };

  // Team functions
  const addTeam = async (team: Omit<Team, "id">) => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          auth_user_id: session.user.id,
          name: team.name,
          description: team.description,
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
          description: data.description || '',
          memberIds: team.memberIds,
          leaderId: team.leaderId,
        };
        
        setTeams([...teams, newTeam]);
      }
    } catch (error) {
      console.error('Error in addTeam:', error);
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: updates.name,
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating team:', error);
        return;
      }

      setTeams(teams.map((team) => (team.id === teamId ? { ...team, ...updates } : team)));
    } catch (error) {
      console.error('Error in updateTeam:', error);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting team:', error);
        return;
      }

      setTeams(teams.filter((team) => team.id !== teamId));
    } catch (error) {
      console.error('Error in deleteTeam:', error);
    }
  };

  // Client functions
  const addClient = async (client: Omit<Client, "id">) => {
    if (!session?.user?.id) return;

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
          status: client.status || 'active',
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
          phone: data.phone || '',
          address: data.address || '',
          website: data.website || '',
          status: data.status as 'active' | 'inactive',
          createdAt: data.created_at,
        };
        
        setClients([...clients, newClient]);
        toast.success(`Client "${client.name}" has been added successfully.`);
      }
    } catch (error) {
      console.error('Error in addClient:', error);
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          address: updates.address,
          website: updates.website,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating client:', error);
        return;
      }

      setClients(clients.map((client) => (client.id === clientId ? { ...client, ...updates } : client)));
    } catch (error) {
      console.error('Error in updateClient:', error);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting client:', error);
        return;
      }

      setClients(clients.filter((client) => client.id !== clientId));
    } catch (error) {
      console.error('Error in deleteClient:', error);
    }
  };

  const getClientById = (clientId: string) => {
    return clients.find((client) => client.id === clientId);
  };

  // Project functions
  const addProject = async (project: Omit<Project, "id">) => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          auth_user_id: session.user.id,
          client_id: project.clientId,
          name: project.name,
          description: project.description,
          status: project.status,
          service_type: project.serviceType,
          start_date: project.startDate,
          due_date: project.dueDate,
          allocated_hours: project.allocatedHours || 0,
          used_hours: 0,
          team_ids: project.teamIds || [],
          watcher_ids: project.watcherIds || [],
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
          status: data.status as 'todo' | 'in-progress' | 'done',
          serviceType: data.service_type as 'project' | 'bank-hours' | 'pay-as-you-go',
          startDate: data.start_date,
          dueDate: data.due_date,
          allocatedHours: data.allocated_hours || 0,
          usedHours: data.used_hours || 0,
          teamIds: data.team_ids || [],
          watcherIds: data.watcher_ids || [],
        };
        
        setProjects([...projects, newProject]);
      }
    } catch (error) {
      console.error('Error in addProject:', error);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          client_id: updates.clientId,
          name: updates.name,
          description: updates.description,
          status: updates.status,
          service_type: updates.serviceType,
          start_date: updates.startDate,
          due_date: updates.dueDate,
          allocated_hours: updates.allocatedHours,
          used_hours: updates.usedHours,
          team_ids: updates.teamIds,
          watcher_ids: updates.watcherIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating project:', error);
        return;
      }

      setProjects(projects.map((project) => (project.id === projectId ? { ...project, ...updates } : project)));
    } catch (error) {
      console.error('Error in updateProject:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting project:', error);
        return;
      }

      setProjects(projects.filter((project) => project.id !== projectId));
    } catch (error) {
      console.error('Error in deleteProject:', error);
    }
  };

  const getProjectById = (projectId: string) => {
    return projects.find((project) => project.id === projectId);
  };

  const convertProjectToTemplate = (projectId: string, templateData: { name: string; description: string }) => {
    const project = getProjectById(projectId);
    if (!project) return;

    const projectTasks = tasks.filter((task) => task.projectId === projectId);

    const templateTasks = projectTasks.map((task) => ({
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      status: task.status,
    }));

    const newTemplate: Omit<ProjectTemplate, "id" | "createdAt" | "usageCount"> = {
      name: templateData.name,
      description: templateData.description,
      serviceType: project.serviceType,
      defaultDuration: 14, // 2 weeks default
      allocatedHours: project.allocatedHours || 0,
      tasks: templateTasks,
      createdBy: currentUser?.id || "",
      teamIds: project.teamIds,
      customFields: project.customFields ? Object.keys(project.customFields) : [],
    };

    addProjectTemplate(newTemplate);
  };

  const watchProject = (projectId: string, userId: string) => {
    const project = getProjectById(projectId);
    if (!project) return;

    const watcherIds = project.watcherIds || [];
    if (!watcherIds.includes(userId)) {
      updateProject(projectId, {
        watcherIds: [...watcherIds, userId],
      });
    }
  };

  const unwatchProject = (projectId: string, userId: string) => {
    const project = getProjectById(projectId);
    if (!project || !project.watcherIds) return;

    updateProject(projectId, {
      watcherIds: project.watcherIds.filter((id) => id !== userId),
    });
  };

  const createProjectFromTemplate = (templateId: string, projectData: any) => {
    const template = projectTemplates.find((t) => t.id === templateId);
    if (!template) return;

    const newProject: Omit<Project, "id"> = {
      name: projectData.name,
      description: projectData.description || template.description,
      clientId: projectData.clientId,
      status: "todo",
      serviceType: template.serviceType,
      startDate: projectData.startDate,
      dueDate: projectData.dueDate,
      allocatedHours: projectData.allocatedHours || template.allocatedHours,
      usedHours: 0,
      teamIds: projectData.teamIds || template.teamIds,
      templateId: templateId,
      customFields: projectData.customFields || {},
    };

    const projectId = uuidv4();
    addProject({ ...newProject, id: projectId });

    // Create tasks from template
    if (template.tasks && template.tasks.length > 0) {
      const newTasks = template.tasks.map((templateTask) => ({
        title: templateTask.title,
        description: templateTask.description,
        projectId: projectId,
        status: templateTask.status || "todo",
        priority: templateTask.priority,
        estimatedHours: templateTask.estimatedHours,
      }));

      newTasks.forEach(task => addTask(task));
    }

    return projectId;
  };

  // Task functions
  const addTask = async (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          auth_user_id: session.user.id,
          project_id: task.projectId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee_id: task.assigneeId,
          due_date: task.dueDate,
          estimated_hours: task.estimatedHours,
          actual_hours: task.actualHours || 0,
          watcher_ids: task.watcherIds || [],
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
          description: data.description,
          projectId: data.project_id,
          assigneeId: data.assignee_id,
          status: data.status as TaskStatus,
          priority: data.priority as 'low' | 'medium' | 'high',
          dueDate: data.due_date,
          estimatedHours: data.estimated_hours,
          actualHours: data.actual_hours || 0,
          watcherIds: data.watcher_ids || [],
          createdAt: data.created_at,
          timeEntries: [],
          comments: [],
        };
        
        setTasks([...tasks, newTask]);
      }
    } catch (error) {
      console.error('Error in addTask:', error);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          project_id: updates.projectId,
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          assignee_id: updates.assigneeId,
          due_date: updates.dueDate,
          estimated_hours: updates.estimatedHours,
          actual_hours: updates.actualHours,
          watcher_ids: updates.watcherIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
    } catch (error) {
      console.error('Error in updateTask:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting task:', error);
        return;
      }

      // Also delete any subtasks
      const subtaskIds = tasks.filter((task) => task.parentTaskId === taskId).map((task) => task.id);
      setTasks(tasks.filter((task) => task.id !== taskId && !subtaskIds.includes(task.id)));
    } catch (error) {
      console.error('Error in deleteTask:', error);
    }
  };

  const getTaskById = (taskId: string) => {
    return tasks.find((task) => task.id === taskId);
  };

  const moveTask = (taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus as TaskStatus });
  };

  const watchTask = (taskId: string, userId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const watcherIds = task.watcherIds || [];
    if (!watcherIds.includes(userId)) {
      updateTask(taskId, {
        watcherIds: [...watcherIds, userId],
      });
    }
  };

  const unwatchTask = (taskId: string, userId: string) => {
    const task = getTaskById(taskId);
    if (!task || !task.watcherIds) return;

    updateTask(taskId, {
      watcherIds: task.watcherIds.filter((id) => id !== userId),
    });
  };

  const linkTasks = (taskId: string, relatedTaskId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const relatedTaskIds = task.relatedTaskIds || [];
    if (!relatedTaskIds.includes(relatedTaskId)) {
      updateTask(taskId, {
        relatedTaskIds: [...relatedTaskIds, relatedTaskId],
      });
    }
  };

  const unlinkTasks = (taskId: string, relatedTaskId: string) => {
    const task = getTaskById(taskId);
    if (!task || !task.relatedTaskIds) return;

    updateTask(taskId, {
      relatedTaskIds: task.relatedTaskIds.filter((id) => id !== relatedTaskId),
    });
  };

  const uploadTaskFile = async (taskId: string, file: File) => {
    // In a real implementation, this would upload to storage
    const fileId = uuidv4();
    const task = getTaskById(taskId);
    if (!task) throw new Error("Task not found");

    const newFile = {
      id: fileId,
      name: file.name,
      url: URL.createObjectURL(file), // This is temporary and would be a real URL in production
      size: file.size,
      sizeKb: Math.round(file.size / 1024),
      uploadedAt: new Date().toISOString(),
    };

    updateTask(taskId, {
      files: [...(task.files || []), newFile],
    });

    return fileId;
  };

  const deleteTaskFile = (taskId: string, fileId: string) => {
    const task = getTaskById(taskId);
    if (!task || !task.files) return;

    updateTask(taskId, {
      files: task.files.filter((file) => file.id !== fileId),
    });
  };

  // Task Status functions
  const addTaskStatus = (status: Omit<TaskStatusDefinition, "id">) => {
    const newStatus = { ...status, id: uuidv4() };
    setTaskStatuses([...taskStatuses, newStatus]);
  };

  const updateTaskStatus = (statusId: string, updates: Partial<TaskStatusDefinition>) => {
    setTaskStatuses(taskStatuses.map((status) => (status.id === statusId ? { ...status, ...updates } : status)));
  };

  const deleteTaskStatus = (statusId: string) => {
    setTaskStatuses(taskStatuses.filter((status) => status.id !== statusId));
  };

  const reorderTaskStatuses = (statuses: TaskStatusDefinition[]) => {
    setTaskStatuses(statuses);
  };

  // Project Status functions
  const addProjectStatus = (status: Omit<ProjectStatusDefinition, "id">) => {
    const newStatus = { ...status, id: uuidv4() };
    setProjectStatuses([...projectStatuses, newStatus]);
  };

  const updateProjectStatus = (statusId: string, updates: Partial<ProjectStatusDefinition>) => {
    setProjectStatuses(projectStatuses.map((status) => (status.id === statusId ? { ...status, ...updates } : status)));
  };

  const deleteProjectStatus = (statusId: string) => {
    setProjectStatuses(projectStatuses.filter((status) => status.id !== statusId));
  };

  const reorderProjectStatuses = (statuses: ProjectStatusDefinition[]) => {
    setProjectStatuses(statuses);
  };

  // TimeEntry functions
  const addTimeEntry = async (timeEntry: Omit<TimeEntry, "id">) => {
    if (!session?.user?.id) return;

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
          notes: timeEntry.notes,
          status: timeEntry.status || 'pending',
          rejection_reason: timeEntry.rejectionReason,
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
          taskId: data.task_id,
          projectId: data.project_id,
          clientId: data.client_id,
          startTime: data.start_time,
          endTime: data.end_time,
          duration: data.duration || 0,
          notes: data.notes,
          status: data.status as TimeEntryStatus,
          rejectionReason: data.rejection_reason,
        };
        
        setTimeEntries([...timeEntries, newTimeEntry]);
      }
    } catch (error) {
      console.error('Error in addTimeEntry:', error);
    }
  };

  const updateTimeEntry = async (timeEntryId: string, updates: Partial<TimeEntry>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          user_id: updates.userId,
          task_id: updates.taskId,
          project_id: updates.projectId,
          client_id: updates.clientId,
          start_time: updates.startTime,
          end_time: updates.endTime,
          duration: updates.duration,
          notes: updates.notes,
          status: updates.status,
          rejection_reason: updates.rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', timeEntryId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating time entry:', error);
        return;
      }

      setTimeEntries(timeEntries.map((entry) => (entry.id === timeEntryId ? { ...entry, ...updates } : entry)));
    } catch (error) {
      console.error('Error in updateTimeEntry:', error);
    }
  };

  const deleteTimeEntry = async (timeEntryId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', timeEntryId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting time entry:', error);
        return;
      }

      setTimeEntries(timeEntries.filter((entry) => entry.id !== timeEntryId));
      
      // If this was the active time entry, clear it
      if (activeTimeEntry && activeTimeEntry.id === timeEntryId) {
        setActiveTimeEntry(null);
      }
    } catch (error) {
      console.error('Error in deleteTimeEntry:', error);
    }
  };

  const startTimeTracking = async (taskId: string, projectId?: string, clientId?: string) => {
    console.log('🚀 startTimeTracking called with:', { taskId, projectId, clientId });
    
    if (activeTimeEntry) {
      console.log('⏹️ Stopping existing timer before starting new one');
      await stopTimeTracking();
    }

    if (!session?.user?.id) {
      console.error('No authenticated user');
      return;
    }

    const newTimeEntry: Omit<TimeEntry, "id"> = {
      userId: currentUser?.id || "",
      taskId,
      projectId,
      clientId,
      startTime: new Date().toISOString(),
      duration: 0, // Will be calculated when stopped
    };

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          auth_user_id: session.user.id,
          user_id: newTimeEntry.userId,
          task_id: newTimeEntry.taskId,
          project_id: newTimeEntry.projectId,
          client_id: newTimeEntry.clientId,
          start_time: newTimeEntry.startTime,
          duration: newTimeEntry.duration,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting time tracking:', error);
        return;
      }

      if (data) {
        const entry: TimeEntry = {
          id: data.id,
          userId: data.user_id,
          taskId: data.task_id,
          projectId: data.project_id,
          clientId: data.client_id,
          startTime: data.start_time,
          endTime: data.end_time,
          duration: data.duration || 0,
          notes: data.notes,
          status: data.status as TimeEntryStatus,
          rejectionReason: data.rejection_reason,
        };
        
        console.log('⏰ Created new active time entry:', entry);
        
        setActiveTimeEntry(entry);
        setTimeEntries([...timeEntries, entry]);
        
        console.log('✅ Active time entry set');
      }
    } catch (error) {
      console.error('Error in startTimeTracking:', error);
    }
  };

  const stopTimeTracking = async (notes?: string) => {
    console.log('🛑 stopTimeTracking called with notes:', notes);
    console.log('📊 Current activeTimeEntry:', activeTimeEntry);
    
    if (!activeTimeEntry || !session?.user?.id) {
      console.log('❌ No active time entry to stop');
      return;
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(activeTimeEntry.startTime);
    const endTimeDate = new Date(endTime);
    const durationInMinutes = Math.floor((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));
    
    console.log('⏱️ Calculated duration:', durationInMinutes, 'minutes');

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime,
          duration: durationInMinutes,
          notes: notes || activeTimeEntry.notes || '',
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeTimeEntry.id)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error stopping time tracking:', error);
        return;
      }

      const completedEntry: TimeEntry = {
        ...activeTimeEntry,
        endTime: endTime,
        duration: durationInMinutes,
        notes: notes || activeTimeEntry.notes || '',
        status: 'pending' as TimeEntryStatus
      };

      console.log('✨ Creating completed entry:', completedEntry);

      // Update timeEntries array by replacing the active entry with completed one
      setTimeEntries(prev => {
        console.log('🔄 Updating timeEntries, previous length:', prev.length);
        
        const newEntries = prev.map(entry => 
          entry.id === activeTimeEntry.id ? completedEntry : entry
        );
        
        console.log('📈 New timeEntries length:', newEntries.length);
        return newEntries;
      });
      
      setActiveTimeEntry(null);
      console.log('🔚 Active time entry cleared');

      toast.success(`Time Entry Saved - Logged ${Math.floor(durationInMinutes / 60)}h ${durationInMinutes % 60}m for this task.`);
      console.log('📢 Toast notification sent');
    } catch (error) {
      console.error('Error in stopTimeTracking:', error);
    }
  };

  const updateTimeEntryStatus = (timeEntryId: string, status: string, reason?: string) => {
    updateTimeEntry(timeEntryId, {
      status: status as TimeEntry["status"],
      rejectionReason: status === "rejected" ? reason : undefined,
    });
  };

  // Message functions
  const addMessage = (message: Omit<Message, "id">) => {
    const newMessage = { ...message, id: uuidv4() };
    setMessages([...messages, newMessage]);
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(messages.map((message) => (message.id === messageId ? { ...message, ...updates } : message)));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message.id !== messageId));
  };

  const sendMessage = (message: Omit<Message, "id" | "timestamp" | "read">) => {
    const newMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages([...messages, newMessage]);
  };

  const createMessage = sendMessage; // Alias for consistency

  const markMessageAsRead = (messageId: string) => {
    updateMessage(messageId, { read: true });
  };

  // Comment functions
  const addComment = (taskId: string, userId: string, content: string, mentionedUserIds?: string[]) => {
    const commentId = uuidv4();
    const task = getTaskById(taskId);
    if (!task) return commentId;

    const newComment = {
      id: commentId,
      userId,
      content,
      timestamp: new Date().toISOString(),
      mentionedUserIds,
    };

    updateTask(taskId, {
      comments: [...(task.comments || []), newComment],
    });

    return commentId;
  };

  // Note functions
  const addNote = async (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          auth_user_id: session.user.id,
          user_id: note.userId,
          title: note.title,
          content: note.content,
          archived: note.archived || false,
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
          userId: data.user_id,
          title: data.title,
          content: data.content || '',
          archived: data.archived || false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          color: note.color,
        };
        
        setNotes([newNote, ...notes]);
      }
    } catch (error) {
      console.error('Error in addNote:', error);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          user_id: updates.userId,
          title: updates.title,
          content: updates.content,
          archived: updates.archived,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }

      setNotes(
        notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      );
    } catch (error) {
      console.error('Error in updateNote:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('auth_user_id', session.user.id);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      setNotes(notes.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Error in deleteNote:', error);
    }
  };

  const getNotesByUser = (userId: string) => {
    return notes.filter((note) => note.userId === userId);
  };

  // Custom Role functions
  const addCustomRole = (role: Omit<CustomRole, "id">) => {
    const newRole = { ...role, id: uuidv4() };
    setCustomRoles([...customRoles, newRole]);
  };

  const updateCustomRole = (roleId: string, updates: Partial<CustomRole>) => {
    setCustomRoles(customRoles.map((role) => (role.id === roleId ? { ...role, ...updates } : role)));
  };

  const deleteCustomRole = (roleId: string) => {
    setCustomRoles(customRoles.filter((role) => role.id !== roleId));
  };

  // Template functions
  const addProjectTemplate = (template: Omit<ProjectTemplate, "id" | "createdAt" | "usageCount">) => {
    const newTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    setProjectTemplates([...projectTemplates, newTemplate]);
  };

  const updateProjectTemplate = (templateId: string, updates: Partial<ProjectTemplate>) => {
    setProjectTemplates(
      projectTemplates.map((template) => (template.id === templateId ? { ...template, ...updates } : template))
    );
  };

  const deleteProjectTemplate = (templateId: string) => {
    setProjectTemplates(projectTemplates.filter((template) => template.id !== templateId));
  };

  // Purchase functions
  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase = { ...purchase, id: uuidv4() };
    setPurchases([...purchases, newPurchase]);
  };

  const updatePurchase = (purchaseId: string, updates: Partial<Purchase>) => {
    setPurchases(purchases.map((purchase) => (purchase.id === purchaseId ? { ...purchase, ...updates } : purchase)));
  };

  const deletePurchase = (purchaseId: string) => {
    setPurchases(purchases.filter((purchase) => purchase.id !== purchaseId));
  };

  // Client Agreement functions
  const addClientAgreement = (agreement: Omit<ClientAgreement, "id">) => {
    const newAgreement = { ...agreement, id: uuidv4() };
    // In a real app, this would be stored in a separate state or database table
    console.log("Adding client agreement:", newAgreement);
  };

  const updateClientAgreement = (agreementId: string, updates: Partial<ClientAgreement>) => {
    // In a real app, this would update the agreement in state or database
    console.log("Updating client agreement:", agreementId, updates);
  };

  const deleteClientAgreement = (agreementId: string) => {
    // In a real app, this would remove the agreement from state or database
    console.log("Deleting client agreement:", agreementId);
  };

  const getClientAgreements = (clientId: string) => {
    // In a real app, this would fetch agreements from state or database
    return [] as ClientAgreement[];
  };

  // Client File functions
  const uploadClientFile = async (clientId: string, file: File) => {
    // In a real implementation, this would upload to storage
    console.log("Uploading file for client:", clientId, file.name);
  };

  const deleteClientFile = (fileId: string) => {
    // In a real implementation, this would delete from storage
    console.log("Deleting client file:", fileId);
  };

  const getClientFiles = (clientId: string) => {
    // In a real app, this would fetch files from state or database
    return [] as ClientFile[];
  };

  // Custom Field functions
  const addCustomField = (field: Omit<CustomField, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newField = {
      ...field,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    setCustomFields(
      customFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : field
      )
    );
  };

  const deleteCustomField = (fieldId: string) => {
    setCustomFields(customFields.filter((field) => field.id !== fieldId));
  };

  const reorderCustomFields = (fields: CustomField[]) => {
    setCustomFields(fields);
  };

  // Initialize session from Supabase
  useEffect(() => {
    const initializeSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load user data when session changes
  useEffect(() => {
    if (session?.user?.id) {
      // In a real app, these would fetch data from Supabase
      // For now, we'll use mock data
      setCurrentUser({
        id: session.user.id,
        name: "Demo User",
        email: session.user.email || "",
        role: "admin",
      });
      
      // Load data from database
      loadClients();
      loadUsers();
      loadProjects();
      loadTasks();
      loadTimeEntries();
      loadNotes();
      loadCustomFields();
    } else {
      // Clear data when user logs out
      setCurrentUser(null);
      setClients([]);
      setUsers([]);
      setProjects([]);
      setTasks([]);
      setTimeEntries([]);
      setNotes([]);
      setCustomFields([]);
      setActiveTimeEntry(null);
    }
  }, [session?.user?.id]);

  const contextValue: AppContextType = {
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
    customRoles,
    comments,
    notes,
    customFields,
    activeTimeEntry,
    taskLogs,
    taskStatuses,
    projectStatuses,

    login,
    logout,

    addUser,
    updateUser,
    deleteUser,
    getUserById,
    inviteUser,
    updateManagerNotificationPreferences,

    addTeam,
    updateTeam,
    deleteTeam,

    addClient,
    updateClient,
    deleteClient,
    getClientById,

    addProject,
    updateProject,
    deleteProject,
    getProjectById,
    convertProjectToTemplate,
    watchProject,
    unwatchProject,
    createProjectFromTemplate,

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

    addTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    reorderTaskStatuses,

    addProjectStatus,
    updateProjectStatus,
    deleteProjectStatus,
    reorderProjectStatuses,

    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimeTracking,
    stopTimeTracking,
    updateTimeEntryStatus,

    addMessage,
    updateMessage,
    deleteMessage,
    sendMessage,
    createMessage,
    markMessageAsRead,

    addComment,

    addNote,
    updateNote,
    deleteNote,
    getNotesByUser,

    addCustomRole,
    updateCustomRole,
    deleteCustomRole,

    addProjectTemplate,
    updateProjectTemplate,
    deleteProjectTemplate,

    addPurchase,
    updatePurchase,
    deletePurchase,

    addClientAgreement,
    updateClientAgreement,
    deleteClientAgreement,
    getClientAgreements,

    uploadClientFile,
    deleteClientFile,
    getClientFiles,

    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
