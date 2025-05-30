
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppContextType } from "./AppContextType";
import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole, Note, TaskLog, ClientAgreement, ClientFile, TaskStatus, TimeEntryStatus } from "@/types";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
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
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Create a mock current user based on session data
          const mockUser: User = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
            email: session.user.email || "",
            role: session.user.user_metadata?.role || "admin",
            teamIds: [],
          };
          setCurrentUser(mockUser);
          
          // Add current user to users array if not already there
          setUsers(prevUsers => {
            const userExists = prevUsers.some(user => user.id === mockUser.id);
            if (!userExists) {
              return [...prevUsers, mockUser];
            }
            return prevUsers;
          });
          
          // Load user data when authenticated
          setTimeout(() => {
            loadUserData();
          }, 0);
        } else {
          // Clear data when logged out
          setCurrentUser(null);
          setUsers([]);
          setClients([]);
          setProjects([]);
          setTasks([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const mockUser: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
          email: session.user.email || "",
          role: session.user.user_metadata?.role || "admin",
          teamIds: [],
        };
        setCurrentUser(mockUser);
        setUsers([mockUser]);
        
        setTimeout(() => {
          loadUserData();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async () => {
    try {
      await Promise.all([
        loadClients(),
        loadProjects(),
        loadTasks(),
      ]);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClients: Client[] = (data || []).map(client => ({
        id: client.id,
        name: client.name,
        contactName: "",
        email: client.email,
        phone: client.phone || "",
        address: client.address || "",
        website: client.website || "",
        billableRate: 0,
        currency: "USD",
        status: client.status as "active" | "inactive",
        createdAt: client.created_at,
        memberIds: [],
      }));

      setClients(formattedClients);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProjects: Project[] = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        serviceType: project.service_type as "project" | "bank-hours" | "pay-as-you-go",
        status: project.status as "todo" | "in-progress" | "done",
        startDate: project.start_date || "",
        dueDate: project.due_date || "",
        allocatedHours: project.allocated_hours || 0,
        usedHours: project.used_hours || 0,
        teamIds: project.team_ids || [],
        watcherIds: project.watcher_ids || [],
      }));

      setProjects(formattedProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks: Task[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: task.status as TaskStatus,
        priority: task.priority as "low" | "medium" | "high",
        projectId: task.project_id,
        assigneeId: task.assignee_id,
        dueDate: task.due_date || "",
        estimatedHours: task.estimated_hours || 0,
        actualHours: task.actual_hours || 0,
        createdAt: task.created_at,
        timeEntries: [],
        comments: [],
        watcherIds: task.watcher_ids || [],
        linkedTaskIds: [],
        files: [],
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  // Authentication functions
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  };

  // Client functions
  const addClient = async (client: Omit<Client, 'id'>) => {
    // This function is now handled by the AddClientDialog component
    // Refresh clients after adding
    await loadClients();
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
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
        .eq('id', clientId);

      if (error) throw error;

      // Refresh clients
      await loadClients();
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      // Refresh clients
      await loadClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  };

  const getClientById = (clientId: string): Client | undefined => {
    return clients.find(client => client.id === clientId);
  };

  // Project functions
  const addProject = async (project: Omit<Project, 'id'>) => {
    // This function is now handled by the CreateProjectDialog component
    // Refresh projects after adding
    await loadProjects();
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          client_id: updates.clientId,
          service_type: updates.serviceType,
          status: updates.status,
          start_date: updates.startDate,
          due_date: updates.dueDate,
          allocated_hours: updates.allocatedHours,
          team_ids: updates.teamIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      // Refresh projects
      await loadProjects();
    } catch (error) {
      console.error("Error updating project:", error);
      throw error;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      // Refresh projects
      await loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const getProjectById = (projectId: string): Project | undefined => {
    return projects.find(project => project.id === projectId);
  };

  // Placeholder implementations for other functions (keeping existing mock behavior for now)
  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substring(2, 15),
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
  };

  const inviteUser = (email: string, name: string, role: string, options?: any) => {
    console.log("Inviting user:", { email, name, role, options });
  };

  const updateManagerNotificationPreferences = (preferences: any) => {
    console.log("Updating manager notification preferences:", preferences);
  };

  // Team functions
  const addTeam = (team: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...team,
      id: Math.random().toString(36).substring(2, 15),
    };
    setTeams(prev => [...prev, newTeam]);
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, ...updates } : team
    ));
  };

  const deleteTeam = (teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  };

  // Task functions
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'timeEntries' | 'comments'>) => {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: [],
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  const moveTask = (taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus as TaskStatus });
  };

  const watchTask = (taskId: string, userId: string) => {
    const task = getTaskById(taskId);
    if (task && !task.watcherIds?.includes(userId)) {
      updateTask(taskId, { 
        watcherIds: [...(task.watcherIds || []), userId] 
      });
    }
  };

  const unwatchTask = (taskId: string, userId: string) => {
    const task = getTaskById(taskId);
    if (task) {
      updateTask(taskId, { 
        watcherIds: task.watcherIds?.filter(id => id !== userId) || [] 
      });
    }
  };

  const linkTasks = (taskId: string, relatedTaskId: string) => {
    const task = getTaskById(taskId);
    if (task && !task.linkedTaskIds?.includes(relatedTaskId)) {
      updateTask(taskId, { 
        linkedTaskIds: [...(task.linkedTaskIds || []), relatedTaskId] 
      });
    }
  };

  const unlinkTasks = (taskId: string, relatedTaskId: string) => {
    const task = getTaskById(taskId);
    if (task) {
      updateTask(taskId, { 
        linkedTaskIds: task.linkedTaskIds?.filter(id => id !== relatedTaskId) || [] 
      });
    }
  };

  const uploadTaskFile = async (taskId: string, file: File): Promise<string> => {
    // Mock implementation
    return Promise.resolve("file-id");
  };

  const deleteTaskFile = (taskId: string, fileId: string) => {
    // Mock implementation
    console.log("Deleting file:", fileId, "from task:", taskId);
  };

  // TimeEntry functions
  const addTimeEntry = (timeEntry: Omit<TimeEntry, 'id'>) => {
    const newTimeEntry: TimeEntry = {
      ...timeEntry,
      id: Math.random().toString(36).substring(2, 15),
    };
    setTimeEntries(prev => [...prev, newTimeEntry]);
  };

  const updateTimeEntry = (timeEntryId: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(prev => prev.map(entry => 
      entry.id === timeEntryId ? { ...entry, ...updates } : entry
    ));
  };

  const deleteTimeEntry = (timeEntryId: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
  };

  const startTimeTracking = (taskId: string, projectId?: string, clientId?: string) => {
    const newTimeEntry: TimeEntry = {
      id: Math.random().toString(36).substring(2, 15),
      userId: currentUser?.id || "",
      taskId,
      projectId: projectId || "",
      clientId: clientId || "",
      startTime: new Date().toISOString(),
      endTime: "",
      duration: 0,
      description: "",
      status: "pending",
    };
    setActiveTimeEntry(newTimeEntry);
    addTimeEntry(newTimeEntry);
  };

  const stopTimeTracking = (notes?: string) => {
    if (activeTimeEntry) {
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(activeTimeEntry.startTime).getTime()) / 1000 / 60);
      
      updateTimeEntry(activeTimeEntry.id, {
        endTime,
        duration,
        description: notes || "",
      });
      
      setActiveTimeEntry(null);
    }
  };

  const updateTimeEntryStatus = (timeEntryId: string, status: string, reason?: string) => {
    updateTimeEntry(timeEntryId, { status: status as TimeEntryStatus, rejectionReason: reason });
  };

  // Message functions
  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(2, 15),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(message => 
      message.id === messageId ? { ...message, ...updates } : message
    ));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
  };

  const sendMessage = (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    addMessage({
      ...message,
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  const createMessage = (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    sendMessage(message);
  };

  const markMessageAsRead = (messageId: string) => {
    updateMessage(messageId, { read: true });
  };

  // Comment functions
  const addComment = (taskId: string, userId: string, content: string, mentionedUserIds?: string[]): string => {
    const comment = {
      id: Math.random().toString(36).substring(2, 15),
      taskId,
      userId,
      content,
      mentionedUserIds: mentionedUserIds || [],
      timestamp: new Date().toISOString(),
    };
    setComments(prev => [...prev, comment]);
    return comment.id;
  };

  // Note functions
  const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: Note = {
      ...note,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
    ));
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const getNotesByUser = (userId: string): Note[] => {
    return notes.filter(note => note.userId === userId);
  };

  // Custom Role functions
  const addCustomRole = (role: Omit<CustomRole, 'id'>) => {
    const newRole: CustomRole = {
      ...role,
      id: Math.random().toString(36).substring(2, 15),
    };
    setCustomRoles(prev => [...prev, newRole]);
  };

  const updateCustomRole = (roleId: string, updates: Partial<CustomRole>) => {
    setCustomRoles(prev => prev.map(role => 
      role.id === roleId ? { ...role, ...updates } : role
    ));
  };

  const deleteCustomRole = (roleId: string) => {
    setCustomRoles(prev => prev.filter(role => role.id !== roleId));
  };

  // Template functions
  const addProjectTemplate = (template: Omit<ProjectTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    const newTemplate: ProjectTemplate = {
      ...template,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };
    setProjectTemplates(prev => [...prev, newTemplate]);
  };

  const updateProjectTemplate = (templateId: string, updates: Partial<ProjectTemplate>) => {
    setProjectTemplates(prev => prev.map(template => 
      template.id === templateId ? { ...template, ...updates } : template
    ));
  };

  const deleteProjectTemplate = (templateId: string) => {
    setProjectTemplates(prev => prev.filter(template => template.id !== templateId));
  };

  const convertProjectToTemplate = (projectId: string, templateData: { name: string; description: string }) => {
    const project = getProjectById(projectId);
    if (project) {
      addProjectTemplate({
        name: templateData.name,
        description: templateData.description,
        serviceType: project.serviceType,
        defaultDuration: 0,
        allocatedHours: project.allocatedHours || 0,
        tasks: tasks.filter(task => task.projectId === projectId).map(task => ({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
        })),
        createdBy: currentUser?.id || "",
        tags: [],
      });
    }
  };

  const watchProject = (projectId: string, userId: string) => {
    const project = getProjectById(projectId);
    if (project && !project.watcherIds?.includes(userId)) {
      updateProject(projectId, { 
        watcherIds: [...(project.watcherIds || []), userId] 
      });
    }
  };

  const unwatchProject = (projectId: string, userId: string) => {
    const project = getProjectById(projectId);
    if (project) {
      updateProject(projectId, { 
        watcherIds: project.watcherIds?.filter(id => id !== userId) || [] 
      });
    }
  };

  const createProjectFromTemplate = (templateId: string, projectData: any) => {
    const template = projectTemplates.find(t => t.id === templateId);
    if (template && template.structure) {
      // Create project from template
      const newProject: Omit<Project, 'id'> = {
        name: projectData.name,
        description: projectData.description,
        clientId: projectData.clientId,
        serviceType: template.structure.serviceType,
        status: "todo",
        startDate: projectData.startDate || "",
        dueDate: projectData.dueDate || "",
        allocatedHours: template.structure.allocatedHours,
        usedHours: 0,
        teamIds: projectData.teamIds || [],
        watcherIds: [],
      };
      
      addProject(newProject);
      
      // Update template usage count
      updateProjectTemplate(templateId, { 
        usageCount: template.usageCount + 1 
      });
    }
  };

  // Purchase functions
  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Math.random().toString(36).substring(2, 15),
    };
    setPurchases(prev => [...prev, newPurchase]);
  };

  const updatePurchase = (purchaseId: string, updates: Partial<Purchase>) => {
    setPurchases(prev => prev.map(purchase => 
      purchase.id === purchaseId ? { ...purchase, ...updates } : purchase
    ));
  };

  const deletePurchase = (purchaseId: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== purchaseId));
  };

  // Client Agreement functions
  const addClientAgreement = (agreement: Omit<ClientAgreement, 'id'>) => {
    // Mock implementation
    console.log("Adding client agreement:", agreement);
  };

  const updateClientAgreement = (agreementId: string, updates: Partial<ClientAgreement>) => {
    // Mock implementation
    console.log("Updating client agreement:", agreementId, updates);
  };

  const deleteClientAgreement = (agreementId: string) => {
    // Mock implementation
    console.log("Deleting client agreement:", agreementId);
  };

  const getClientAgreements = (clientId: string): ClientAgreement[] => {
    // Mock implementation
    return [];
  };

  // Client File functions
  const uploadClientFile = async (clientId: string, file: File): Promise<void> => {
    // Mock implementation
    console.log("Uploading client file:", clientId, file.name);
  };

  const deleteClientFile = (fileId: string) => {
    // Mock implementation
    console.log("Deleting client file:", fileId);
  };

  const getClientFiles = (clientId: string): ClientFile[] => {
    // Mock implementation
    return [];
  };

  // Custom Field functions
  const addCustomField = (field: any) => {
    setCustomFields(prev => [...prev, { ...field, id: Math.random().toString(36).substring(2, 15) }]);
  };

  const deleteCustomField = (fieldId: string) => {
    setCustomFields(prev => prev.filter(field => field.id !== fieldId));
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
    customRoles,
    comments,
    notes,
    customFields,
    activeTimeEntry,
    taskLogs,
    
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
    
    // TimeEntry functions
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimeTracking,
    stopTimeTracking,
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
    deleteCustomField,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
