import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User, Team, Client, Project, Task, TimeEntry, Message, Purchase, CustomField, Comment, Role, ProjectTemplate, TemplateTask, CustomRole, ClientFile, ClientAgreement
} from "@/types";
import { AppContextType } from "./AppContextType";
import {
  mockUsers, mockTeams, mockClients, mockProjects,
  mockTasks, mockTimeEntries, mockMessages, mockPurchases, mockCustomFields, mockProjectTemplates, mockCustomRoles
} from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "lovable-app-state";

// Create the context with the proper type
const AppContext = createContext<AppContextType>({} as AppContextType);

const saveStateToStorage = (key: string, data: any) => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    console.error("Failed to save state to local storage:", error);
  }
};

const loadStateFromStorage = (key: string) => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) return null;
    return JSON.parse(serializedData);
  } catch (error) {
    console.error("Failed to load state from local storage:", error);
    return null;
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Try to load state from localStorage first, fall back to mock data if not available
  const initialState = loadStateFromStorage(STORAGE_KEY) || {
    users: mockUsers,
    teams: mockTeams,
    clients: mockClients,
    projects: mockProjects,
    tasks: mockTasks,
    timeEntries: mockTimeEntries,
    messages: mockMessages,
    purchases: mockPurchases,
    customFields: mockCustomFields,
    projectTemplates: [],
    customRoles: [],
    clientAgreements: [],
  };

  const [users, setUsers] = useState<User[]>(initialState.users || mockUsers);
  const [teams, setTeams] = useState<Team[]>(initialState.teams || mockTeams);
  const [clients, setClients] = useState<Client[]>(initialState.clients || mockClients);
  const [projects, setProjects] = useState<Project[]>(initialState.projects || mockProjects);
  const [tasks, setTasks] = useState<Task[]>(initialState.tasks || mockTasks);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialState.timeEntries || mockTimeEntries);
  const [messages, setMessages] = useState<Message[]>(initialState.messages || mockMessages);
  const [purchases, setPurchases] = useState<Purchase[]>(initialState.purchases || mockPurchases);
  const [customFields, setCustomFields] = useState<CustomField[]>(initialState.customFields || mockCustomFields);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>(initialState.projectTemplates || []);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(initialState.customRoles || []);
  const [clientAgreements, setClientAgreements] = useState<ClientAgreement[]>(initialState.clientAgreements || []);
  
  // Current user (hardcoded for now, would come from auth in real app)
  const [currentUser, setCurrentUser] = useState<User | null>(initialState.currentUser || mockUsers[0]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(initialState.activeTimeEntry || null);
  
  const { toast } = useToast();
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      users,
      teams,
      clients,
      projects,
      tasks,
      timeEntries,
      messages,
      purchases,
      customFields,
      projectTemplates,
      customRoles,
      clientAgreements,
      currentUser,
      activeTimeEntry,
    };
    
    saveStateToStorage(STORAGE_KEY, state);
  }, [
    users, teams, clients, projects, tasks, timeEntries, 
    messages, purchases, customFields, projectTemplates, 
    customRoles, clientAgreements, currentUser, activeTimeEntry
  ]);
  
  // Role management functions
  const addCustomRole = (role: Omit<CustomRole, "id">) => {
    const newRole = { ...role, id: `role-${uuidv4()}` };
    setCustomRoles((prev) => [...prev, newRole]);
    toast({ title: "Success", description: "Role has been created" });
  };
  
  // Add the missing role management functions
  const updateCustomRole = (id: string, updates: Partial<CustomRole>) => {
    setCustomRoles((prev) => prev.map(role => role.id === id ? { ...role, ...updates } : role));
    toast({ title: "Success", description: "Role has been updated" });
  };
  
  const deleteCustomRole = (id: string) => {
    setCustomRoles((prev) => prev.filter(role => role.id !== id));
    toast({ title: "Success", description: "Role has been deleted" });
  };
  
  const assignRoleToUser = (userId: string, roleId: string) => {
    const role = customRoles.find(r => r.id === roleId);
    if (!role) {
      toast({ 
        title: "Error", 
        description: "Role not found", 
        variant: "destructive" 
      });
      return;
    }
    
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          customRoleId: roleId
        };
      }
      return user;
    }));
    
    toast({ 
      title: "Role Assigned", 
      description: `${role.name} role has been assigned successfully` 
    });
  };
  
  // CRUD operations for clients
  const addClient = (client: Omit<Client, "id">) => {
    const newClient = { 
      ...client, 
      id: `client-${uuidv4()}`,
      status: client.status || 'active' // Default to active if not provided
    };
    
    setClients(prevClients => {
      const updatedClients = [...prevClients, newClient];
      return updatedClients;
    });
    
    toast({ title: "Success", description: "Client has been added" });
  };
  
  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map(client => client.id === id ? { ...client, ...updates } : client));
    toast({ title: "Success", description: "Client has been updated" });
  };
  
  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter(client => client.id !== id));
    toast({ title: "Success", description: "Client has been deleted" });
  };
  
  // Client agreement operations
  const addClientAgreement = (agreement: Omit<ClientAgreement, "id" | "createdAt">) => {
    const newAgreement = { 
      ...agreement, 
      id: `agreement-${uuidv4()}`,
      createdAt: new Date().toISOString()
    };
    
    setClientAgreements(prev => [...prev, newAgreement]);
    
    // Update client with reference to this agreement
    setClients(prev => prev.map(client => {
      if (client.id === agreement.clientId) {
        const agreements = client.agreements || [];
        return {
          ...client,
          agreements: [...agreements, newAgreement.id]
        };
      }
      return client;
    }));
    
    toast({ title: "Agreement Added", description: "Client agreement has been created" });
    return newAgreement;
  };
  
  const updateClientAgreement = (id: string, updates: Partial<ClientAgreement>) => {
    setClientAgreements(prev => prev.map(agreement => 
      agreement.id === id ? { ...agreement, ...updates } : agreement
    ));
    
    toast({ title: "Agreement Updated", description: "Client agreement has been updated" });
  };
  
  const deleteClientAgreement = (id: string) => {
    const agreement = clientAgreements.find(a => a.id === id);
    if (!agreement) return;
    
    setClientAgreements(prev => prev.filter(agreement => agreement.id !== id));
    
    // Remove reference from client
    setClients(prev => prev.map(client => {
      if (client.id === agreement.clientId && client.agreements) {
        return {
          ...client,
          agreements: client.agreements.filter(agreementId => agreementId !== id)
        };
      }
      return client;
    }));
    
    toast({ title: "Agreement Deleted", description: "Client agreement has been removed" });
  };
  
  const getClientAgreements = (clientId: string) => {
    return clientAgreements.filter(agreement => agreement.clientId === clientId);
  };
  
  const getClientAgreementById = (id: string) => {
    return clientAgreements.find(agreement => agreement.id === id);
  };
  
  // Authentication
  const login = async (email: string, password: string) => {
    // In a real app, this would make an API call to validate credentials
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      setCurrentUser(user);
      toast({ title: "Login successful", description: `Welcome back, ${user.name}!` });
      return true;
    } else {
      toast({ 
        title: "Login failed", 
        description: "Invalid email or password", 
        variant: "destructive" 
      });
      return false;
    }
  };
  
  const logout = () => {
    setCurrentUser(null);
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };
  
  // CRUD operations for users
  const addUser = (user: Omit<User, "id">) => {
    const newUser = { ...user, id: `user-${uuidv4()}` };
    setUsers((prev) => [...prev, newUser]);
    toast({ title: "Success", description: "User has been added" });
  };
  
  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map(user => user.id === id ? { ...user, ...updates } : user));
    toast({ title: "Success", description: "User has been updated" });
  };
  
  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter(user => user.id !== id));
    toast({ title: "Success", description: "User has been deleted" });
  };
  
  const inviteUser = (
    email: string, 
    name: string, 
    role: string, 
    options?: {
      phone?: string;
      employmentType?: "full-time" | "part-time" | "contract";
      billingType?: "hourly" | "monthly";
      billingRate?: number;
      hourlyRate?: number;
      monthlyRate?: number;
      currency?: string;
      teamIds?: string[];
      clientId?: string;
      clientRole?: "admin" | "team";
    }
  ) => {
    // In a real app, this would send an email invitation
    const newUser: Omit<User, "id"> = {
      name,
      email,
      role: role as Role,
      avatar: "",
      teamIds: options?.teamIds || [],
    };
    
    if (options?.phone) {
      newUser.phone = options.phone;
    }
    
    if (options?.employmentType) {
      newUser.employmentType = options.employmentType;
    }
    
    if (options?.billingType) {
      newUser.billingType = options.billingType;
      
      if (options.billingType === "hourly" && options.hourlyRate !== undefined) {
        newUser.hourlyRate = options.hourlyRate;
        newUser.billingRate = options.hourlyRate;
      } else if (options.billingType === "monthly" && options.monthlyRate !== undefined) {
        newUser.monthlyRate = options.monthlyRate;
        newUser.billingRate = options.monthlyRate;
      } else if (options.billingRate !== undefined) {
        newUser.billingRate = options.billingRate;
        if (options.billingType === "hourly") {
          newUser.hourlyRate = options.billingRate;
        } else {
          newUser.monthlyRate = options.billingRate;
        }
      }
    }
    
    if (options?.currency) {
      newUser.currency = options.currency;
    }
    
    if (options?.clientId && role === "client") {
      newUser.clientId = options.clientId;
    }
    
    if (options?.clientRole && role === "client") {
      newUser.clientRole = options.clientRole;
    }
    
    addUser(newUser);
    
    toast({
      title: "User invited",
      description: `Invitation sent to ${name}`,
    });
  };
  
  // CRUD operations for teams
  const addTeam = (team: Omit<Team, "id">) => {
    const newTeam = { ...team, id: `team-${uuidv4()}` };
    setTeams((prev) => [...prev, newTeam]);
    toast({ title: "Success", description: "Team has been created" });
  };
  
  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams((prev) => prev.map(team => team.id === id ? { ...team, ...updates } : team));
    toast({ title: "Success", description: "Team has been updated" });
  };
  
  const deleteTeam = (id: string) => {
    setTeams((prev) => prev.filter(team => team.id !== id));
    toast({ title: "Success", description: "Team has been deleted" });
  };
  
  // CRUD operations for projects
  const addProject = (project: Omit<Project, "id">) => {
    const newProject = { ...project, id: `project-${uuidv4()}` };
    setProjects((prev) => [...prev, newProject]);
    toast({ title: "Success", description: "Project has been created" });
  };
  
  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map(project => project.id === id ? { ...project, ...updates } : project));
    toast({ title: "Success", description: "Project has been updated" });
  };
  
  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter(project => project.id !== id));
    toast({ title: "Success", description: "Project has been deleted" });
  };
  
  const watchProject = (projectId: string, userId: string) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      const watcherIds = project.watcherIds || [];
      if (watcherIds.includes(userId)) return project;
      
      return {
        ...project,
        watcherIds: [...watcherIds, userId]
      };
    }));
    
    toast({ title: "Watching Project", description: "You will be notified of changes to this project" });
  };
  
  const unwatchProject = (projectId: string, userId: string) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      const watcherIds = project.watcherIds || [];
      return {
        ...project,
        watcherIds: watcherIds.filter(id => id !== userId)
      };
    }));
    
    toast({ title: "Unwatched Project", description: "You will no longer be notified of changes to this project" });
  };
  
  const convertProjectToTemplate = (projectId: string, templateName: string, templateDescription: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      toast({ 
        title: "Error", 
        description: "Project not found", 
        variant: "destructive" 
      });
      return;
    }
    
    // Get all tasks for this project
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    
    // Create template tasks from project tasks (excluding parent tasks)
    const topLevelTasks = projectTasks.filter(task => !task.parentTaskId);
    
    const templateTasks: TemplateTask[] = topLevelTasks.map(task => {
      // Find subtasks for this task
      const subtasks = projectTasks.filter(t => t.parentTaskId === task.id);
      
      return {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        estimatedHours: task.customFields?.estimatedHours as number | undefined,
        subtasks: subtasks.map(subtask => ({
          title: subtask.title,
          description: subtask.description,
          estimatedHours: subtask.customFields?.estimatedHours as number | undefined
        })),
      };
    });
    
    // Create the new template
    const newTemplate: ProjectTemplate = {
      id: `template-${uuidv4()}`,
      name: templateName || `${project.name} Template`,
      description: templateDescription || `Template created from ${project.name}`,
      serviceType: project.serviceType,
      allocatedHours: project.allocatedHours,
      tasks: templateTasks,
      teamIds: project.teamIds,
      usageCount: 0,
      createdBy: currentUser?.id || 'unknown',
      createdAt: new Date().toISOString()
    };
    
    setProjectTemplates(prev => [...prev, newTemplate]);
    
    toast({ 
      title: "Template Created", 
      description: `Project template "${newTemplate.name}" has been created` 
    });
  };
  
  // Project template operations
  const addProjectTemplate = (template: Omit<ProjectTemplate, "id" | "usageCount" | "createdAt">) => {
    const newTemplate = { 
      ...template, 
      id: `template-${uuidv4()}`,
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    setProjectTemplates((prev) => [...prev, newTemplate]);
    toast({ title: "Success", description: "Project template has been created" });
  };
  
  const updateProjectTemplate = (id: string, updates: Partial<ProjectTemplate>) => {
    setProjectTemplates((prev) => 
      prev.map(template => template.id === id ? { ...template, ...updates } : template)
    );
    toast({ title: "Success", description: "Project template has been updated" });
  };
  
  const deleteProjectTemplate = (id: string) => {
    setProjectTemplates((prev) => prev.filter(template => template.id !== id));
    toast({ title: "Success", description: "Project template has been deleted" });
  };
  
  const createProjectFromTemplate = (templateId: string, projectData: {
    name: string;
    clientId: string;
    startDate: string;
    dueDate?: string;
  }) => {
    const template = projectTemplates.find(t => t.id === templateId);
    if (!template) {
      toast({ 
        title: "Error", 
        description: "Template not found", 
        variant: "destructive" 
      });
      return;
    }
    
    // Create the project
    const newProject: Omit<Project, "id"> = {
      name: projectData.name,
      description: template.description,
      clientId: projectData.clientId,
      teamIds: template.teamIds || [],
      taskIds: [],
      startDate: projectData.startDate,
      dueDate: projectData.dueDate,
      status: "todo",
      serviceType: template.serviceType,
      allocatedHours: template.allocatedHours,
      usedHours: 0
    };
    
    const projectId = `project-${uuidv4()}`;
    setProjects((prev) => [...prev, { ...newProject, id: projectId }]);
    
    // Create tasks from template
    const taskIds: string[] = [];
    const tasksToCreate: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">[] = [];
    
    // First create top-level tasks
    const taskIdMap = new Map<number, string>();
    
    template.tasks.forEach((templateTask, index) => {
      const taskId = `task-${uuidv4()}`;
      taskIdMap.set(index, taskId);
      taskIds.push(taskId);
      
      tasksToCreate.push({
        title: templateTask.title,
        description: templateTask.description,
        projectId: projectId,
        assigneeId: taskIdMap.get(index) || `user-${uuidv4()}`, // Use assigneeId instead of assigneeIds
        status: templateTask.status,
        priority: templateTask.priority,
        customFields: {},
        subtasks: []
      });
    });
    
    // Add all tasks
    const newTasks: Task[] = tasksToCreate.map((taskData, index) => ({
      ...taskData,
      id: taskIdMap.get(index) || `task-${uuidv4()}`,
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: []
    }));
    
    // Create subtasks and establish dependencies
    template.tasks.forEach((templateTask, index) => {
      const parentTaskId = taskIdMap.get(index);
      if (!parentTaskId) return;
      
      const parentTask = newTasks.find(t => t.id === parentTaskId);
      if (!parentTask) return;
      
      // Create subtasks
      const subtaskIds: string[] = [];
      templateTask.subtasks.forEach(subtask => {
        const subtaskId = `task-${uuidv4()}`;
        subtaskIds.push(subtaskId);
        
        const newSubtask: Task = {
          id: subtaskId,
          title: subtask.title,
          description: subtask.description,
          projectId: projectId,
          parentTaskId: parentTaskId,
          assigneeId: subtaskId, // Use assigneeId instead of assigneeIds
          status: "todo",
          priority: "medium",
          createdAt: new Date().toISOString(),
          customFields: {},
          subtasks: [],
          timeEntries: [],
          comments: []
        };
        
        newTasks.push(newSubtask);
      });
      
      // Update parent task with subtask IDs
      parentTask.subtasks = subtaskIds;
    });
    
    // Add all tasks to the state
    setTasks(prev => [...prev, ...newTasks]);
    
    // Update the project with task IDs
    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, taskIds }
          : p
      )
    );
    
    // Update template usage count
    setProjectTemplates(prev => 
      prev.map(t => 
        t.id === templateId 
          ? { ...t, usageCount: t.usageCount + 1 }
          : t
      )
    );
    
    toast({ 
      title: "Project Created", 
      description: `Project "${projectData.name}" has been created from template` 
    });
  };
  
  // CRUD operations for tasks
  const addTask = (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => {
    const newTask = {
      ...task,
      id: `task-${uuidv4()}`,
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: [],
    };
    setTasks((prev) => [...prev, newTask]);
    
    // Update project with new taskId
    setProjects((prev) => prev.map(project => 
      project.id === newTask.projectId 
        ? { ...project, taskIds: [...project.taskIds, newTask.id] } 
        : project
    ));
    
    toast({ title: "Success", description: "Task has been created" });
  };
  
  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map(task => task.id === id ? { ...task, ...updates } : task));
    toast({ title: "Success", description: "Task has been updated" });
  };
  
  const deleteTask = (id: string) => {
    const task = tasks.find(task => task.id === id);
    if (!task) return;
    
    setTasks((prev) => prev.filter(task => task.id !== id));
    
    // Update project by removing task
    setProjects((prev) => prev.map(project => 
      project.id === task.projectId
        ? { ...project, taskIds: project.taskIds.filter(taskId => taskId !== id) }
        : project
    ));
    
    toast({ title: "Success", description: "Task has been deleted" });
  };
  
  const moveTask = (taskId: string, newStatus: Task["status"], newProjectId?: string) => {
    setTasks((prev) => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const updates: Partial<Task> = { status: newStatus };
      if (newProjectId && newProjectId !== task.projectId) {
        updates.projectId = newProjectId;
      }
      
      return { ...task, ...updates };
    }));
    
    toast({ title: "Task Moved", description: `Task moved to ${newStatus.replace(/-/g, ' ')}` });
  };
  
  const watchTask = (taskId: string, userId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const watcherIds = task.watcherIds || [];
      if (watcherIds.includes(userId)) return task;
      
      return {
        ...task,
        watcherIds: [...watcherIds, userId]
      };
    }));
    
    toast({ title: "Watching Task", description: "You will be notified of changes to this task" });
  };
  
  const unwatchTask = (taskId: string, userId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const watcherIds = task.watcherIds || [];
      return {
        ...task,
        watcherIds: watcherIds.filter(id => id !== userId)
      };
    }));
    
    toast({ title: "Unwatched Task", description: "You will no longer be notified of changes to this task" });
  };
  
  // Time tracking operations
  const startTimeTracking = (taskId?: string, projectId?: string, clientId?: string) => {
    if (activeTimeEntry) {
      stopTimeTracking("Automatically stopped by starting new timer");
    }
    
    // Extract client ID if we have a project ID but no client ID
    let associatedClientId = clientId;
    let associatedProjectId = projectId;
    
    if (!associatedClientId && projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        associatedClientId = project.clientId;
      }
    }
    
    // Extract project ID if we have a task ID but no project ID
    if (!associatedProjectId && taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        associatedProjectId = task.projectId;
        
        // Also get the client ID if we don't have it yet
        if (!associatedClientId) {
          const taskProject = projects.find(p => p.id === task.projectId);
          if (taskProject) {
            associatedClientId = taskProject.clientId;
          }
        }
      }
    }
    
    if (!associatedClientId) {
      toast({ 
        title: "Error", 
        description: "A client is required for time tracking", 
        variant: "destructive"
      });
      return;
    }
    
    const newTimeEntry = {
      id: `time-${uuidv4()}`,
      taskId,
      projectId: associatedProjectId,
      clientId: associatedClientId,
      userId: currentUser?.id || '',
      startTime: new Date().toISOString(),
      duration: 0,
      billable: true,
    };
    
    setActiveTimeEntry(newTimeEntry);
    toast({ title: "Timer Started", description: "Time tracking has begun" });
  };
  
  const stopTimeTracking = (notes?: string) => {
    if (!activeTimeEntry || !currentUser) return;
    
    const endTime = new Date().toISOString();
    const startTime = new Date(activeTimeEntry.startTime);
    const durationMs = new Date().getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    
    const completedTimeEntry: TimeEntry = {
      ...activeTimeEntry,
      endTime,
      duration: durationMinutes,
      notes: notes || activeTimeEntry.notes,
    };
    
    setTimeEntries((prev) => [...prev, completedTimeEntry]);
    
    // If this time entry is associated with a task, update the task
    if (activeTimeEntry.taskId) {
      setTasks((prev) => prev.map(task => 
        task.id === activeTimeEntry.taskId
          ? { ...task, timeEntries: [...task.timeEntries, completedTimeEntry] }
          : task
      ));
    }
    
    // Update project used hours
    setProjects((prev) => {
      const projectId = activeTimeEntry.projectId || 
        (activeTimeEntry.taskId ? tasks.find(t => t.id === activeTimeEntry.taskId)?.projectId : undefined);
      
      if (!projectId) return prev;
      
      return prev.map(project => 
        project.id === projectId
          ? { ...project, usedHours: project.usedHours + (durationMinutes / 60) }
          : project
      );
    });
    
    setActiveTimeEntry(null);
    toast({ title: "Timer Stopped", description: `${durationMinutes} minutes tracked` });
  };
  
  const addTimeEntry = (entry: Omit<TimeEntry, "id">) => {
    const newEntry = { ...entry, id: `time-${uuidv4()}` };
    setTimeEntries((prev) => [...prev, newEntry]);
    
    // Update task with the time entry
    setTasks((prev) => prev.map(task => 
      task.id === entry.taskId
        ? { ...task, timeEntries: [...task.timeEntries, newEntry] }
        : task
    ));
    
    toast({ title: "Time Entry Added", description: `${entry.duration} minutes logged` });
  };
  
  // Message operations
  const sendMessage = (message: Omit<Message, "id" | "timestamp" | "read">) => {
    const newMessage = {
      ...message,
      id: `msg-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setMessages((prev) => [...prev, newMessage]);
    toast({ title: "Message Sent", description: "Your message has been sent" });
  };
  
  const markMessageAsRead = (id: string) => {
    setMessages((prev) => prev.map(msg => 
      msg.id === id ? { ...msg, read: true } : msg
    ));
  };
  
  // Handle comment posting with @mentions
  const addComment = (taskId: string, userId: string, content: string) => {
    // Extract mentioned users with @firstname pattern
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex) || [];
    
    // Find user IDs from mentions (matching first names)
    const mentionedUserIds = mentions
      .map(mention => {
        const mentionName = mention.substring(1); // Remove the @ symbol
        // Find user by first name (first part of full name)
        const user = users.find(u => {
          const firstName = u.name.split(' ')[0];
          return firstName.toLowerCase() === mentionName.toLowerCase();
        });
        return user?.id;
      })
      .filter(Boolean) as string[];
    
    // Create comment
    const newComment: Comment = {
      id: `comment-${uuidv4()}`,
      taskId,
      userId,
      content,
      timestamp: new Date().toISOString(),
      mentionedUserIds
    };
    
    // Find the task and update it with the new comment
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      toast({ 
        title: "Error", 
        description: "Task not found", 
        variant: "destructive" 
      });
      return;
    }
    
    // Update task with new comment
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, comments: [...t.comments, newComment] } 
        : t
    ));
    
    // Create message notifications for mentioned users
    if (mentionedUserIds.length > 0) {
      const projectId = task.projectId;
      const project = projects.find(p => p.id === projectId);
      const clientId = project?.clientId;
      
      mentionedUserIds.forEach(recipientId => {
        const messageNotification: Message = {
          id: `msg-${uuidv4()}`,
          senderId: userId,
          recipientIds: [recipientId],
          content: content,
          timestamp: new Date().toISOString(),
          read: false,
          commentId: newComment.id,
          taskId: taskId,
          projectId: projectId,
          clientId: clientId
        };
        
        setMessages(prev => [...prev, messageNotification]);
      });
    }
    
    toast({ title: "Comment Added", description: "Your comment has been posted" });
    return newComment;
  };
  
  // Purchase operations
  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase = { ...purchase, id: `purchase-${uuidv4()}` };
    setPurchases((prev) => [...prev, newPurchase]);
    toast({ title: "Purchase Recorded", description: "Client purchase has been added" });
  };
  
  // Custom field operations
  const addCustomField = (field: Omit<CustomField, "id">) => {
    const newField = { ...field, id: `field-${uuidv4()}` };
    setCustomFields((prev) => [...prev, newField]);
    toast({ title: "Custom Field Added", description: `Field "${field.name}" has been created` });
  };
  
  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields((prev) => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
    toast({ title: "Custom Field Updated", description: "Changes have been saved" });
  };
  
  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter(field => field.id !== id));
    toast({ title: "Custom Field Deleted", description: "Field has been removed" });
  };
  
  // Manager notification preferences
  const updateManagerNotificationPreferences = (userId: string, preferences: User['notificationPreferences']) => {
    setUsers(prev => prev.map(user => 
      user.id === userId
        ? { ...user, notificationPreferences: preferences }
        : user
    ));
    
    toast({ title: "Preferences Updated", description: "Notification preferences have been saved" });
  };
  
  // Get tasks due within a specific timeframe
  const getTasksDueWithinTimeframe = (timeframe: string) => {
    const now = new Date();
    let endDate = new Date();
    
    switch (timeframe) {
      case 'same-day':
        // Tasks due today
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate.toDateString() === now.toDateString();
        });
      case '1-day':
        // Tasks due tomorrow
        endDate.setDate(now.getDate() + 1);
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate > now && dueDate <= endDate;
        });
      case '3-days':
        // Tasks due in the next 3 days
        endDate.setDate(now.getDate() + 3);
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate > now && dueDate <= endDate;
        });
      case '1-week':
        // Tasks due in the next week
        endDate.setDate(now.getDate() + 7);
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate > now && dueDate <= endDate;
        });
      default:
        return [];
    }
  };
  
  // Filtering and retrieval
  const getTasksByProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId);
  };
  
  const getTasksByUser = (userId: string) => {
    return tasks.filter(task => task.assigneeId === userId); // Use assigneeId instead of task.assigneeIds.includes(userId)
  };
  
  const getUnreadMessageCount = (userId: string) => {
    return messages.filter(msg => 
      msg.recipientIds.includes(userId) && !msg.read
    ).length;
  };
  
  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
  };
  
  const getProjectById = (id: string) => {
    return projects.find(project => project.id === id);
  };
  
  const getClientById = (id: string) => {
    return clients.find(client => client.id === id);
  };
  
  const getTaskById = (id: string) => {
    return tasks.find(task => task.id === id);
  };
  
  // Mock client files state
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([]);

  // Client file management functions
  const getClientFiles = (clientId: string) => {
    return clientFiles.filter(file => file.clientId === clientId);
  };

  const uploadClientFile = async (clientId: string, file: File): Promise<ClientFile> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newFile: ClientFile = {
      id: uuidv4(),
      clientId,
      name: file.name,
      path: URL.createObjectURL(file), // In a real app, this would be a server path
      type: file.type,
      sizeKb: Math.round(file.size / 1024),
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.id || "",
    };
    
    setClientFiles(prev => [...prev, newFile]);
    return newFile;
  };

  const deleteClientFile = async (clientId: string, fileId: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setClientFiles(prev => prev.filter(file => file.id !== fileId));
  };

  return (
    <AppContext.Provider value={{
      // Data
      users,
      teams,
      clients,
      projects,
      tasks,
      timeEntries,
      messages,
      purchases,
      customFields,
      projectTemplates,
      customRoles,
      clientAgreements,
      
      // Current user and active states
      currentUser,
      activeTimeEntry,
      
      // Authentication
      login,
      logout,
      
      // Role management
      addCustomRole,
      updateCustomRole,
      deleteCustomRole,
      assignRoleToUser,
      
      // CRUD operations for users
      addUser,
      updateUser,
      deleteUser,
      inviteUser,
      
      // CRUD operations for teams
      addTeam,
      updateTeam,
      deleteTeam,
      
      // CRUD operations for clients
      addClient,
      updateClient,
      deleteClient,
      
      // Client agreement operations
      addClientAgreement,
      updateClientAgreement,
      deleteClientAgreement,
      getClientAgreements,
      getClientAgreementById,
      
      // CRUD operations for projects
      addProject,
      updateProject,
      deleteProject,
      watchProject,
      unwatchProject,
      convertProjectToTemplate,
      
      // Project template operations
      addProjectTemplate,
      updateProjectTemplate,
      deleteProjectTemplate,
      createProjectFromTemplate,
      
      // CRUD operations for tasks
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      watchTask,
      unwatchTask,
      
      // Time tracking operations
      startTimeTracking,
      stopTimeTracking,
      addTimeEntry,
      
      // Message operations
      sendMessage,
      markMessageAsRead,
      addComment,
      
      // Purchase operations
      addPurchase,
      
      // Custom field operations
      addCustomField,
      updateCustomField,
      deleteCustomField,
      
      // Manager notification preferences
      updateManagerNotificationPreferences,
      
      // Tasks due within timeframe
      getTasksDueWithinTimeframe,
      
      // Filtering and retrieval
      getTasksByProject,
      getTasksByUser,
      getUnreadMessageCount,
      getUserById,
      getProjectById,
      getClientById,
      getTaskById,
      
      // Client file management
      getClientFiles,
      uploadClientFile,
      deleteClientFile,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
