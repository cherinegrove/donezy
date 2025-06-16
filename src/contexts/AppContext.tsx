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
  const addUser = (user: Omit<User, "id">) => {
    const newUser = { ...user, id: uuidv4() };
    setUsers([...users, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(users.map((user) => (user.id === userId ? { ...user, ...updates } : user)));
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
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
  const addTeam = (team: Omit<Team, "id">) => {
    const newTeam = { ...team, id: uuidv4() };
    setTeams([...teams, newTeam]);
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    setTeams(teams.map((team) => (team.id === teamId ? { ...team, ...updates } : team)));
  };

  const deleteTeam = (teamId: string) => {
    setTeams(teams.filter((team) => team.id !== teamId));
  };

  // Client functions
  const addClient = (client: Omit<Client, "id">) => {
    const newClient = {
      ...client,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setClients([...clients, newClient]);
  };

  const updateClient = (clientId: string, updates: Partial<Client>) => {
    setClients(clients.map((client) => (client.id === clientId ? { ...client, ...updates } : client)));
  };

  const deleteClient = (clientId: string) => {
    setClients(clients.filter((client) => client.id !== clientId));
  };

  const getClientById = (clientId: string) => {
    return clients.find((client) => client.id === clientId);
  };

  // Project functions
  const addProject = (project: Omit<Project, "id">) => {
    const newProject = { ...project, id: uuidv4(), usedHours: 0 };
    setProjects([...projects, newProject]);
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(projects.map((project) => (project.id === projectId ? { ...project, ...updates } : project)));
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter((project) => project.id !== projectId));
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
    setProjects([...projects, { ...newProject, id: projectId }]);

    // Create tasks from template
    if (template.tasks && template.tasks.length > 0) {
      const newTasks = template.tasks.map((templateTask) => ({
        id: uuidv4(),
        title: templateTask.title,
        description: templateTask.description,
        projectId: projectId,
        status: templateTask.status || "todo",
        priority: templateTask.priority,
        estimatedHours: templateTask.estimatedHours,
        createdAt: new Date().toISOString(),
      }));

      setTasks([...tasks, ...newTasks]);
    }

    return projectId;
  };

  // Task functions
  const addTask = (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => {
    const newTask = {
      ...task,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: [],
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const deleteTask = (taskId: string) => {
    // Also delete any subtasks
    const subtaskIds = tasks.filter((task) => task.parentTaskId === taskId).map((task) => task.id);
    setTasks(tasks.filter((task) => task.id !== taskId && !subtaskIds.includes(task.id)));
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
  const addTimeEntry = (timeEntry: Omit<TimeEntry, "id">) => {
    const newTimeEntry = { ...timeEntry, id: uuidv4() };
    setTimeEntries([...timeEntries, newTimeEntry]);
  };

  const updateTimeEntry = (timeEntryId: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(timeEntries.map((entry) => (entry.id === timeEntryId ? { ...entry, ...updates } : entry)));
  };

  const deleteTimeEntry = (timeEntryId: string) => {
    setTimeEntries(timeEntries.filter((entry) => entry.id !== timeEntryId));
  };

  const startTimeTracking = (taskId: string, projectId?: string, clientId?: string) => {
    if (activeTimeEntry) {
      stopTimeTracking();
    }

    const newTimeEntry: Omit<TimeEntry, "id"> = {
      userId: currentUser?.id || "",
      taskId,
      projectId,
      clientId,
      startTime: new Date().toISOString(),
      duration: 0, // Will be calculated when stopped
    };

    const entry = { ...newTimeEntry, id: uuidv4() };
    setActiveTimeEntry(entry);
    setTimeEntries([...timeEntries, entry]);
  };

  const stopTimeTracking = (notes?: string) => {
    console.log('stopTimeTracking called with notes:', notes);
    console.log('Current activeTimeEntry:', activeTimeEntry);
    
    if (!activeTimeEntry) {
      console.log('No active time entry to stop');
      return;
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(activeTimeEntry.startTime);
    const endTimeDate = new Date(endTime);
    const durationInMinutes = Math.floor((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));
    
    console.log('Calculated duration:', durationInMinutes, 'minutes');

    const completedEntry: TimeEntry = {
      ...activeTimeEntry,
      endTime: endTime,
      duration: durationInMinutes,
      notes: notes || activeTimeEntry.notes || '',
      status: 'pending' as TimeEntryStatus
    };

    console.log('Creating completed entry:', completedEntry);

    // Add the completed entry to timeEntries and clear activeTimeEntry
    setTimeEntries(prev => {
      const newEntries = [completedEntry, ...prev];
      console.log('Updated timeEntries length:', newEntries.length);
      console.log('New time entries:', newEntries);
      return newEntries;
    });
    
    setActiveTimeEntry(null);
    console.log('Active time entry cleared');

    toast.success(`Time Entry Saved - Logged ${Math.floor(durationInMinutes / 60)}h ${durationInMinutes % 60}m for this task.`);
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
  const addNote = (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newNote = {
      ...note,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setNotes([...notes, newNote]);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
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
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
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
      
      // Load other data
      loadCustomFields();
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
