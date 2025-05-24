import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  User,
  Team,
  Client,
  Project,
  Task,
  TimeEntry,
  Message,
  Purchase,
  ProjectTemplate,
  CustomRole,
  Note,
  TaskLog,
  ClientAgreement,
  ClientFile,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { AppContextType } from "./AppContextType";

// Create a function to get empty state for new users
const getEmptyUserState = () => ({
  users: [],
  teams: [],
  clients: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  messages: [],
  purchases: [],
  projectTemplates: [],
  customRoles: [],
  comments: [],
  notes: [],
  customFields: [],
  clientAgreements: [],
  clientFiles: [],
  taskLogs: []
});

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);

  // Initialize with empty state instead of mock data
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
  const [clientAgreements, setClientAgreements] = useState<ClientAgreement[]>([]);
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);

  // Load session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // Get current user function
  const getProfile = useCallback(async () => {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`display_name, avatar_url`)
        .eq('id', session?.user?.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setCurrentUser({
          id: session?.user?.id,
          name: data.display_name || session?.user?.email?.split('@')[0] || 'User',
          email: session?.user?.email || '',
          avatar: data.avatar_url,
          role: 'admin' as const, // Default role for new users
          teamIds: [], // Add missing teamIds
        });
      }
    } catch (error: any) {
      console.error("Error loading user profile:", error.message);
    }
  }, [session?.user?.id, session?.user?.email])

  // Set current user
  useEffect(() => {
    if (session?.user) {
      getProfile()
    }
  }, [session, getProfile])

  // Initialize user data - only load if user exists and is authenticated
  useEffect(() => {
    if (currentUser && session) {
      console.log("Initializing empty state for user:", currentUser.email);
      
      // Set empty state for new user
      const emptyState = getEmptyUserState();
      setUsers(emptyState.users);
      setTeams(emptyState.teams);
      setClients(emptyState.clients);
      setProjects(emptyState.projects);
      setTasks(emptyState.tasks);
      setTimeEntries(emptyState.timeEntries);
      setMessages(emptyState.messages);
      setPurchases(emptyState.purchases);
      setProjectTemplates(emptyState.projectTemplates);
      setCustomRoles(emptyState.customRoles);
      setComments(emptyState.comments);
      setNotes(emptyState.notes);
      setCustomFields(emptyState.customFields);
      setClientAgreements(emptyState.clientAgreements);
      setClientFiles(emptyState.clientFiles);
      setTaskLogs(emptyState.taskLogs);
    }
  }, [currentUser, session]);

  const login = useCallback(async (email, password) => {
    try {
      console.log("Attempting to sign in with Supabase");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) {
        console.error("Supabase sign-in error:", error);
        return false;
      }
      
      console.log("Supabase sign-in successful:", data);
      
      // Fetch the user profile after successful sign-in
      await getProfile();
      
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }, [getProfile]);

  const logout = useCallback(async () => {
    try {
      console.log("Logging out user");
      
      // Clear all state
      setCurrentUser(null);
      setSession(null);
      
      // Reset all data to empty state
      const emptyState = getEmptyUserState();
      setUsers(emptyState.users);
      setTeams(emptyState.teams);
      setClients(emptyState.clients);
      setProjects(emptyState.projects);
      setTasks(emptyState.tasks);
      setTimeEntries(emptyState.timeEntries);
      setMessages(emptyState.messages);
      setPurchases(emptyState.purchases);
      setProjectTemplates(emptyState.projectTemplates);
      setCustomRoles(emptyState.customRoles);
      setComments(emptyState.comments);
      setNotes(emptyState.notes);
      setCustomFields(emptyState.customFields);
      setClientAgreements(emptyState.clientAgreements);
      setClientFiles(emptyState.clientFiles);
      setTaskLogs(emptyState.taskLogs);
      setActiveTimeEntry(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }, []);

  // Helper functions
  const getUserById = useCallback((userId: string) => {
    return users.find(user => user.id === userId);
  }, [users]);

  const getClientById = useCallback((clientId: string) => {
    return clients.find(client => client.id === clientId);
  }, [clients]);

  const getTaskById = useCallback((taskId: string) => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  const getProjectById = useCallback((projectId: string) => {
    return projects.find(project => project.id === projectId);
  }, [projects]);

  const getNotesByUser = useCallback((userId: string) => {
    return notes.filter(note => note.userId === userId);
  }, [notes]);

  const getClientAgreements = useCallback((clientId: string) => {
    return clientAgreements.filter(agreement => agreement.clientId === clientId);
  }, [clientAgreements]);

  const getClientFiles = useCallback((clientId: string) => {
    return clientFiles.filter(file => file.clientId === clientId);
  }, [clientFiles]);

  // User functions
  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15),
      ...user,
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prev =>
      prev.map(user => (user.id === userId ? { ...user, ...updates } : user))
    );
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  }, []);

  const inviteUser = useCallback((email: string, name: string, role: string) => {
    console.log("Inviting user:", email, name, role);
    // In a real app, this would send an invitation email
  }, []);

  // Team functions
  const addTeam = useCallback((team: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      id: Math.random().toString(36).substring(2, 15),
      ...team,
    };
    setTeams(prev => [...prev, newTeam]);
  }, []);

  const updateTeam = useCallback((teamId: string, updates: Partial<Team>) => {
    setTeams(prev =>
      prev.map(team => (team.id === teamId ? { ...team, ...updates } : team))
    );
  }, []);

  const deleteTeam = useCallback((teamId: string) => {
    setTeams(prev => prev.filter(team => team.id !== teamId));
  }, []);

  // Project functions
  const addProject = useCallback((project: Omit<Project, 'id'> | Project) => {
    console.log("Adding project:", project);
    
    // Handle both cases: with ID (from CreateProjectDialog) and without ID (legacy)
    const newProject: Project = 'id' in project ? project as Project : {
      id: Math.random().toString(36).substring(2, 15),
      ...project,
    };
    
    setProjects(prev => {
      const updated = [...prev, newProject];
      console.log("Projects state updated:", updated);
      return updated;
    });
    
    console.log("Project added successfully with ID:", newProject.id);
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    console.log("Updating project:", projectId, updates);
    setProjects(prev =>
      prev.map(project => (project.id === projectId ? { ...project, ...updates } : project))
    );
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    console.log("Deleting project:", projectId);
    
    // Delete all related tasks first
    setTasks(prev => prev.filter(task => task.projectId !== projectId));
    
    // Delete all related time entries
    setTimeEntries(prev => prev.filter(entry => entry.projectId !== projectId));
    
    // Delete all related messages
    setMessages(prev => prev.filter(message => message.projectId !== projectId));
    
    // Finally delete the project
    setProjects(prev => prev.filter(project => project.id !== projectId));
  }, []);

  const watchProject = useCallback((projectId: string, userId: string) => {
    setProjects(prev =>
      prev.map(project => 
        project.id === projectId 
          ? { ...project, watcherIds: [...(project.watcherIds || []), userId] }
          : project
      )
    );
  }, []);

  const unwatchProject = useCallback((projectId: string, userId: string) => {
    setProjects(prev =>
      prev.map(project => 
        project.id === projectId 
          ? { ...project, watcherIds: (project.watcherIds || []).filter(id => id !== userId) }
          : project
      )
    );
  }, []);

  const convertProjectToTemplate = useCallback((projectId: string, templateData: { name: string; description: string }) => {
    const project = getProjectById(projectId);
    if (project) {
      const newTemplate: ProjectTemplate = {
        id: Math.random().toString(36).substring(2, 15),
        ...templateData,
        createdBy: currentUser?.id || '',
        serviceType: project.serviceType,
        defaultDuration: 30,
        allocatedHours: project.allocatedHours || 0,
        tasks: [],
        teamIds: project.teamIds,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };
      setProjectTemplates(prev => [...prev, newTemplate]);
    }
  }, [getProjectById, currentUser]);

  const createProjectFromTemplate = useCallback((templateId: string, projectData: any) => {
    const template = projectTemplates.find(t => t.id === templateId);
    if (template) {
      addProject({
        ...projectData,
        templateId: templateId,
        status: 'todo' as const,
        usedHours: 0,
        serviceType: template.serviceType,
        allocatedHours: template.allocatedHours,
        teamIds: projectData.memberIds || [],
        watcherIds: [],
      });
      updateProjectTemplate(templateId, { usageCount: (template.usageCount || 0) + 1 });
    }
  }, [projectTemplates, addProject]);

  // Task functions
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'timeEntries' | 'comments'>) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: [],
      ...task,
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, ...updates } : task))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  const moveTask = useCallback((taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus as any });
  }, [updateTask]);

  const watchTask = useCallback((taskId: string, userId: string) => {
    setTasks(prev =>
      prev.map(task => 
        task.id === taskId 
          ? { ...task, watcherIds: [...(task.watcherIds || []), userId] }
          : task
      )
    );
  }, []);

  const unwatchTask = useCallback((taskId: string, userId: string) => {
    setTasks(prev =>
      prev.map(task => 
        task.id === taskId 
          ? { ...task, watcherIds: (task.watcherIds || []).filter(id => id !== userId) }
          : task
      )
    );
  }, []);

  const linkTasks = useCallback((taskId: string, relatedTaskId: string) => {
    console.log("Linking tasks:", taskId, relatedTaskId);
    // Implementation would add relationship between tasks
  }, []);

  const unlinkTasks = useCallback((taskId: string, relatedTaskId: string) => {
    console.log("Unlinking tasks:", taskId, relatedTaskId);
    // Implementation would remove relationship between tasks
  }, []);

  const uploadTaskFile = useCallback(async (taskId: string, file: File) => {
    console.log("Uploading task file:", taskId, file.name);
    // In a real implementation, this would upload to storage and return the URL
    return Promise.resolve(`/uploads/${file.name}`);
  }, []);

  const deleteTaskFile = useCallback((taskId: string, fileId: string) => {
    console.log("Deleting task file:", taskId, fileId);
    // Implementation would delete file from task
  }, []);

  // TimeEntry functions
  const addTimeEntry = useCallback((timeEntry: Omit<TimeEntry, 'id'>) => {
    const newTimeEntry: TimeEntry = {
      id: Math.random().toString(36).substring(2, 15),
      ...timeEntry,
    };
    setTimeEntries(prev => [...prev, newTimeEntry]);
  }, []);

  const updateTimeEntry = useCallback((timeEntryId: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(prev =>
      prev.map(entry => (entry.id === timeEntryId ? { ...entry, ...updates } : entry))
    );
  }, []);

  const deleteTimeEntry = useCallback((timeEntryId: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== timeEntryId));
    if (activeTimeEntry && activeTimeEntry.id === timeEntryId) {
      setActiveTimeEntry(null);
    }
  }, [activeTimeEntry]);

  const startTimeTracking = useCallback((taskId: string, projectId?: string, clientId?: string) => {
    if (!currentUser) return;
    
    const newTimeEntry: TimeEntry = {
      id: Math.random().toString(36).substring(2, 15),
      userId: currentUser.id,
      taskId,
      projectId,
      clientId,
      startTime: new Date().toISOString(),
      duration: 0,
      billable: true,
    };
    
    setActiveTimeEntry(newTimeEntry);
    setTimeEntries(prev => [...prev, newTimeEntry]);
  }, [currentUser]);

  const stopTimeTracking = useCallback((notes?: string) => {
    if (!activeTimeEntry) return;
    
    const endTime = new Date();
    const startTime = new Date(activeTimeEntry.startTime);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
    
    updateTimeEntry(activeTimeEntry.id, {
      endTime: endTime.toISOString(),
      duration,
      description: notes,
    });
    
    setActiveTimeEntry(null);
  }, [activeTimeEntry, updateTimeEntry]);

  const updateTimeEntryStatus = useCallback((timeEntryId: string, status: string, reason?: string) => {
    updateTimeEntry(timeEntryId, { 
      status: status as any,
      ...(reason && { declineReason: reason })
    });
  }, [updateTimeEntry]);

  // Message functions
  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 15),
      ...message,
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev =>
      prev.map(message => (message.id === messageId ? { ...message, ...updates } : message))
    );
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
  }, []);

  const sendMessage = useCallback((message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    const completeMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    addMessage(completeMessage);
  }, [addMessage]);

  const createMessage = useCallback((message: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    const completeMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    addMessage(completeMessage);
  }, [addMessage]);

  const markMessageAsRead = useCallback((messageId: string) => {
    updateMessage(messageId, { read: true });
  }, [updateMessage]);

  // Purchase functions
  const addPurchase = useCallback((purchase: Omit<Purchase, 'id'>) => {
    const newPurchase: Purchase = {
      id: Math.random().toString(36).substring(2, 15),
      ...purchase,
    };
    setPurchases(prev => [...prev, newPurchase]);
  }, []);

  const updatePurchase = useCallback((purchaseId: string, updates: Partial<Purchase>) => {
    setPurchases(prev =>
      prev.map(purchase => (purchase.id === purchaseId ? { ...purchase, ...updates } : purchase))
    );
  }, []);

  const deletePurchase = useCallback((purchaseId: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== purchaseId));
  }, []);

  // ProjectTemplate functions
  const addProjectTemplate = useCallback((projectTemplate: Omit<ProjectTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    const newTemplate: ProjectTemplate = {
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      usageCount: 0,
      ...projectTemplate,
    };
    setProjectTemplates(prev => [...prev, newTemplate]);
  }, []);

  const updateProjectTemplate = useCallback((projectTemplateId: string, updates: Partial<ProjectTemplate>) => {
    setProjectTemplates(prev =>
      prev.map(template => (template.id === projectTemplateId ? { ...template, ...updates } : template))
    );
  }, []);

  const deleteProjectTemplate = useCallback((projectTemplateId: string) => {
    setProjectTemplates(prev => prev.filter(template => template.id !== projectTemplateId));
  }, []);

  // CustomRole functions
  const addCustomRole = useCallback((customRole: Omit<CustomRole, 'id'>) => {
    const newRole: CustomRole = {
      id: Math.random().toString(36).substring(2, 15),
      ...customRole,
    };
    setCustomRoles(prev => [...prev, newRole]);
  }, []);

  const updateCustomRole = useCallback((customRoleId: string, updates: Partial<CustomRole>) => {
    setCustomRoles(prev =>
      prev.map(role => (role.id === customRoleId ? { ...role, ...updates } : role))
    );
  }, []);

  const deleteCustomRole = useCallback((customRoleId: string) => {
    setCustomRoles(prev => prev.filter(role => role.id !== customRoleId));
  }, []);

  // Comment functions
  const addComment = useCallback((taskId: string, userId: string, content: string, mentionedUserIds: string[] = []) => {
    const commentId = Math.random().toString(36).substring(2, 15);
    const comment = {
      id: commentId,
      userId,
      content,
      timestamp: new Date().toISOString(),
      mentionedUserIds,
    };
    
    setTasks(prev =>
      prev.map(task => 
        task.id === taskId 
          ? { ...task, comments: [...(task.comments || []), comment] }
          : task
      )
    );
    
    return commentId;
  }, []);

  // Note functions
  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log("Adding note:", note);
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 15),
      ...note,
      title: note.title || 'Untitled Note',
      color: note.color || 'yellow',
      archived: note.archived || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
  }, []);

  const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
    console.log("Updating note:", noteId, updates);
    setNotes(prev =>
      prev.map(note => (note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note))
    );
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    console.log("Deleting note:", noteId);
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }, []);

  // Client functions
  const addClient = useCallback((client: Omit<Client, 'id'>) => {
    console.log("Adding client:", client);
    const newClient: Client = {
      id: Math.random().toString(36).substring(2, 15),
      ...client,
    };
    setClients(prev => [...prev, newClient]);
  }, []);

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    console.log("Updating client:", clientId, updates);
    setClients(prev =>
      prev.map(client => (client.id === clientId ? { ...client, ...updates } : client))
    );
  }, []);

  const deleteClient = useCallback((clientId: string) => {
    console.log("Deleting client:", clientId);
    
    // Get all projects for this client
    const clientProjects = projects.filter(project => project.clientId === clientId);
    
    // Delete all projects and their related data
    clientProjects.forEach(project => {
      deleteProject(project.id);
    });
    
    // Delete all purchases for this client
    setPurchases(prev => prev.filter(purchase => purchase.clientId !== clientId));
    
    // Delete all client agreements
    setClientAgreements(prev => prev.filter(agreement => agreement.clientId !== clientId));
    
    // Delete all client files
    setClientFiles(prev => prev.filter(file => file.clientId !== clientId));
    
    // Finally delete the client
    setClients(prev => prev.filter(client => client.id !== clientId));
  }, [projects, deleteProject]);

  // Client agreement functions
  const addClientAgreement = useCallback((agreement: Omit<ClientAgreement, 'id'>) => {
    const newAgreement: ClientAgreement = {
      id: Math.random().toString(36).substring(2, 15),
      ...agreement,
      usedHours: agreement.usedHours || 0,
    };
    setClientAgreements(prev => [...prev, newAgreement]);
  }, []);

  const updateClientAgreement = useCallback((agreementId: string, updates: Partial<ClientAgreement>) => {
    setClientAgreements(prev =>
      prev.map(agreement => (agreement.id === agreementId ? { ...agreement, ...updates } : agreement))
    );
  }, []);

  const deleteClientAgreement = useCallback((agreementId: string) => {
    setClientAgreements(prev => prev.filter(agreement => agreement.id !== agreementId));
  }, []);

  // Client file functions
  const uploadClientFile = useCallback(async (clientId: string, file: File) => {
    const newFile: ClientFile = {
      id: Math.random().toString(36).substring(2, 15),
      clientId,
      name: file.name,
      sizeKb: file.size / 1024,
      uploadedAt: new Date().toISOString(),
    };
    setClientFiles(prev => [...prev, newFile]);
  }, []);

  const deleteClientFile = useCallback((fileId: string) => {
    setClientFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Custom field functions
  const addCustomField = useCallback((field: any) => {
    const newField = {
      id: Math.random().toString(36).substring(2, 15),
      ...field,
    };
    setCustomFields(prev => [...prev, newField]);
  }, []);

  const deleteCustomField = useCallback((fieldId: string) => {
    setCustomFields(prev => prev.filter(field => field.id !== fieldId));
  }, []);

  // Notification functions
  const updateManagerNotificationPreferences = useCallback((preferences: any) => {
    console.log("Updating notification preferences:", preferences);
  }, []);

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
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    inviteUser,
    addTeam,
    updateTeam,
    deleteTeam,
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
    addPurchase,
    updatePurchase,
    deletePurchase,
    addProjectTemplate,
    updateProjectTemplate,
    deleteProjectTemplate,
    convertProjectToTemplate,
    createProjectFromTemplate,
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    addComment,
    addNote,
    updateNote,
    deleteNote,
    getNotesByUser,
    addProject,
    updateProject,
    deleteProject,
    getProjectById,
    watchProject,
    unwatchProject,
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    addClientAgreement,
    updateClientAgreement,
    deleteClientAgreement,
    getClientAgreements,
    uploadClientFile,
    getClientFiles,
    deleteClientFile,
    addCustomField,
    deleteCustomField,
    updateManagerNotificationPreferences,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
