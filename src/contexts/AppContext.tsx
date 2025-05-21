
import { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import {
  User, Team, Client, Project, Task, TimeEntry, Comment, Message, Purchase, CustomField, ProjectTemplate, CustomRole, ClientFile, ClientAgreement, TimeEntryStatus, TaskLog, Note
} from "@/types";
import { mockUsers, mockTeams, mockClients, mockProjects, mockTasks, mockTimeEntries, mockMessages, mockPurchases, mockCustomFields, mockProjectTemplates, mockCustomRoles } from "@/data/mockData";
import { AppContextType } from "./AppContextType";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback values
// You should set these environment variables in your Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

interface AppContextProps {
  children: React.ReactNode;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

// Rename AppContextProvider to AppProvider for consistency with App.tsx
export const AppProvider: React.FC<AppContextProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const storedUsers = localStorage.getItem('users');
    return storedUsers ? JSON.parse(storedUsers) : mockUsers;
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    const storedTeams = localStorage.getItem('teams');
    return storedTeams ? JSON.parse(storedTeams) : mockTeams;
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const storedClients = localStorage.getItem('clients');
    return storedClients ? JSON.parse(storedClients) : mockClients;
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const storedProjects = localStorage.getItem('projects');
    return storedProjects ? JSON.parse(storedProjects) : mockProjects;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const storedTasks = localStorage.getItem('tasks');
    return storedTasks ? JSON.parse(storedTasks) : mockTasks;
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const storedTimeEntries = localStorage.getItem('timeEntries');
    return storedTimeEntries ? JSON.parse(storedTimeEntries) : mockTimeEntries;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const storedMessages = localStorage.getItem('messages');
    return storedMessages ? JSON.parse(storedMessages) : mockMessages;
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const storedPurchases = localStorage.getItem('purchases');
    return storedPurchases ? JSON.parse(storedPurchases) : mockPurchases;
  });
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const storedCustomFields = localStorage.getItem('customFields');
    return storedCustomFields ? JSON.parse(storedCustomFields) : mockCustomFields;
  });
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>(() => {
    const storedProjectTemplates = localStorage.getItem('projectTemplates');
    return storedProjectTemplates ? JSON.parse(storedProjectTemplates) : mockProjectTemplates;
  });
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => {
    const storedCustomRoles = localStorage.getItem('customRoles');
    return storedCustomRoles ? JSON.parse(storedCustomRoles) : mockCustomRoles;
  });
  const [clientAgreements, setClientAgreements] = useState<ClientAgreement[]>(() => {
    const storedClientAgreements = localStorage.getItem('clientAgreements');
    return storedClientAgreements ? JSON.parse(storedClientAgreements) : [];
  });
  
  // Initialize taskLogs state
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>(() => {
    const storedTaskLogs = localStorage.getItem('taskLogs');
    return storedTaskLogs ? JSON.parse(storedTaskLogs) : [];
  });
  
  // Add notes state
  const [notes, setNotes] = useState<Note[]>(() => {
    const storedNotes = localStorage.getItem('notes');
    return storedNotes ? JSON.parse(storedNotes) : [];
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  
  const navigate = useNavigate();
  
  // Check for active Supabase session on load
  useEffect(() => {
    // Get the current session and user
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user data from Supabase
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        // If we have profile data, set the current user accordingly
        if (profileData) {
          // Check if this user exists in our local state
          let user = users.find(u => u.email === session.user.email);
          
          // If not, create a new user record
          if (!user) {
            // Create a new user based on Supabase data
            user = {
              id: profileData.id || uuidv4(),
              name: profileData.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              role: profileData.role || 'developer',
              teamIds: profileData.team_ids || [],
              avatar: profileData.avatar || generateRandomAvatar(),
              employmentType: profileData.employment_type,
              billingType: profileData.billing_type,
              billingRate: profileData.billing_rate,
              hourlyRate: profileData.hourly_rate,
              monthlyRate: profileData.monthly_rate,
              currency: profileData.currency,
            };
            
            // Add the user to the users state
            setUsers(prevUsers => [...prevUsers, user as User]);
          }
          
          // Set as current user
          setCurrentUser(user);
        } else {
          // If no profile exists yet but we have a session, try to find or create a user
          const email = session.user.email;
          if (email) {
            let user = users.find(u => u.email === email);
            
            if (user) {
              setCurrentUser(user);
            } else {
              // Create a basic user
              const newUser: User = {
                id: uuidv4(),
                name: email.split('@')[0],
                email,
                role: 'developer',
                teamIds: [],
                avatar: generateRandomAvatar(),
              };
              
              setUsers(prevUsers => [...prevUsers, newUser]);
              setCurrentUser(newUser);
              
              // Create their profile in Supabase
              await supabase
                .from('user_profiles')
                .insert([{
                  user_id: session.user.id,
                  name: newUser.name,
                  email: newUser.email,
                  role: newUser.role,
                }]);
            }
          }
        }
      }
    };
    
    checkSession();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Handle sign in
          await checkSession();
        } else if (event === 'SIGNED_OUT') {
          // Handle sign out
          setCurrentUser(null);
          navigate('/login');
        }
      }
    );
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, users]);
  
  // Helper function to add task logs
  const addTaskLog = (taskId: string, userId: string | undefined, action: string, details?: string) => {
    const newLog: TaskLog = {
      id: uuidv4(),
      taskId,
      userId,
      timestamp: new Date().toISOString(),
      action,
      details
    };
    
    setTaskLogs(prevLogs => [...prevLogs, newLog]);
    return newLog;
  };
  
  // Helper function to create time entries
  const createTimeEntry = (entry: Omit<TimeEntry, "id">): TimeEntry => {
    return {
      id: uuidv4(),
      ...entry,
    };
  };
  
  // Note operations
  const addNote = (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...note
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
    return newNote.id;
  };
  
  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prevNotes =>
      prevNotes.map(note => 
        note.id === id 
          ? { ...note, ...updates, updatedAt: new Date().toISOString() } 
          : note
      )
    );
  };
  
  const archiveNote = (id: string) => {
    updateNote(id, { archived: true });
  };
  
  const unarchiveNote = (id: string) => {
    updateNote(id, { archived: false });
  };
  
  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };
  
  const updateNotePosition = (id: string, position: { x: number, y: number }) => {
    updateNote(id, { position });
  };
  
  const getNotesByUser = (userId: string, includeArchived = false) => {
    return notes.filter(note => 
      note.userId === userId && (includeArchived || !note.archived)
    );
  };
  
  // Update localStorage on state change
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('teams', JSON.stringify(teams));
    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('purchases', JSON.stringify(purchases));
    localStorage.setItem('customFields', JSON.stringify(customFields));
    localStorage.setItem('projectTemplates', JSON.stringify(projectTemplates));
    localStorage.setItem('customRoles', JSON.stringify(customRoles));
    localStorage.setItem('clientAgreements', JSON.stringify(clientAgreements));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('taskLogs', JSON.stringify(taskLogs));
    localStorage.setItem('notes', JSON.stringify(notes)); // Add notes to localStorage
  }, [users, teams, clients, projects, tasks, timeEntries, messages, purchases, customFields, projectTemplates, customRoles, clientAgreements, currentUser, taskLogs, notes]);
  
  // Helper function to generate a random avatar URL
  const generateRandomAvatar = () => {
    const randomNumber = Math.floor(Math.random() * 70);
    return `https://i.pravatar.cc/300?img=${randomNumber}`;
  };
  
  // Authentication functions
  const login = async (email: string, password: string) => {
    try {
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Fetch user data from our local state
        const user = users.find(user => user.email === email);
        
        if (user) {
          setCurrentUser(user);
          navigate('/');
          return true;
        } else {
          // If user exists in Supabase but not in our local state, create them
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
          
          if (profileData) {
            // Create a new user based on profile data
            const newUser: User = {
              id: uuidv4(),
              name: profileData.name || email.split('@')[0],
              email: email,
              role: profileData.role || 'developer',
              teamIds: profileData.team_ids || [],
              avatar: profileData.avatar || generateRandomAvatar(),
              employmentType: profileData.employment_type,
              billingType: profileData.billing_type,
              billingRate: profileData.billing_rate,
              hourlyRate: profileData.hourly_rate,
              monthlyRate: profileData.monthly_rate,
              currency: profileData.currency,
            };
            
            setUsers(prevUsers => [...prevUsers, newUser]);
            setCurrentUser(newUser);
            navigate('/');
            return true;
          } else {
            // Create a basic user
            const newUser: User = {
              id: uuidv4(),
              name: email.split('@')[0],
              email: email,
              role: 'developer',
              teamIds: [],
              avatar: generateRandomAvatar(),
            };
            
            setUsers(prevUsers => [...prevUsers, newUser]);
            setCurrentUser(newUser);
            
            // Create their profile in Supabase
            await supabase
              .from('user_profiles')
              .insert([{
                user_id: data.user.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
              }]);
            
            navigate('/');
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };
  
  const logout = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear local state
    setCurrentUser(null);
    navigate('/login');
  };
  
  // For user invite functionality, sync with Supabase
  const inviteUser = async (email: string, name: string, role: string, options?: {
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
  }) => {
    // Create the user in our local state first
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      avatar: generateRandomAvatar(),
      role: role as any,
      teamIds: options?.teamIds || [],
      phone: options?.phone,
      employmentType: options?.employmentType,
      billingType: options?.billingType,
      billingRate: options?.billingRate,
      hourlyRate: options?.hourlyRate,
      monthlyRate: options?.monthlyRate,
      currency: options?.currency,
      clientId: options?.clientId,
      clientRole: options?.clientRole,
    };
    
    setUsers(prevUsers => [...prevUsers, newUser]);
    
    try {
      // Check if we have an authenticated session to create the user in Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Create user profile in Supabase
        await supabase.from('user_profiles').insert([{
          name,
          email,
          role,
          phone: options?.phone,
          employment_type: options?.employmentType,
          billing_type: options?.billingType,
          billing_rate: options?.billingRate,
          hourly_rate: options?.hourlyRate,
          monthly_rate: options?.monthlyRate,
          currency: options?.currency,
          team_ids: options?.teamIds,
          client_id: options?.clientId,
          client_role: options?.clientRole,
        }]);
      }
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
      // We'll keep the user in local state even if Supabase sync fails
    }
  };
  
  // Role management operations
  const addCustomRole = (role: Omit<CustomRole, "id">) => {
    const newRole: CustomRole = {
      id: uuidv4(),
      ...role
    };
    setCustomRoles(prevRoles => [...prevRoles, newRole]);
  };
  
  const updateCustomRole = (id: string, updates: Partial<CustomRole>) => {
    setCustomRoles(prevRoles =>
      prevRoles.map(role => (role.id === id ? { ...role, ...updates } : role))
    );
  };
  
  const deleteCustomRole = (id: string) => {
    setCustomRoles(prevRoles => prevRoles.filter(role => role.id !== id));
  };
  
  const assignRoleToUser = (userId: string, roleId: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user => (user.id === userId ? { ...user, customRoleId: roleId } : user))
    );
  };
  
  // CRUD operations for users
  const addUser = (user: Omit<User, "id">) => {
    const newUser: User = {
      id: uuidv4(),
      ...user,
      avatar: generateRandomAvatar(),
    };
    setUsers(prevUsers => [...prevUsers, newUser]);
  };
  
  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prevUsers =>
      prevUsers.map(user => (user.id === id ? { ...user, ...updates } : user))
    );
  };
  
  const deleteUser = (id: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
  };
  
  // CRUD operations for teams
  const addTeam = (team: Omit<Team, "id">) => {
    const newTeam: Team = {
      id: uuidv4(),
      ...team
    };
    setTeams(prevTeams => [...prevTeams, newTeam]);
  };
  
  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams(prevTeams =>
      prevTeams.map(team => (team.id === id ? { ...team, ...updates } : team))
    );
  };
  
  const deleteTeam = (id: string) => {
    setTeams(prevTeams => prevTeams.filter(team => team.id !== id));
  };
  
  // CRUD operations for clients
  const addClient = (client: Omit<Client, "id">) => {
    const newClient: Client = {
      id: uuidv4(),
      ...client
    };
    setClients(prevClients => [...prevClients, newClient]);
  };
  
  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prevClients =>
      prevClients.map(client => (client.id === id ? { ...client, ...updates } : client))
    );
  };
  
  const deleteClient = (id: string) => {
    // First, check if the client exists
    const clientToDelete = clients.find(client => client.id === id);
    if (!clientToDelete) {
      console.error(`Client with ID ${id} not found`);
      return;
    }
    
    console.log(`Deleting client: ${clientToDelete.name} (${id})`);
    
    // Delete all projects associated with this client
    const clientProjects = projects.filter(project => project.clientId === id);
    const clientProjectIds = clientProjects.map(project => project.id);
    console.log(`Deleting ${clientProjects.length} projects associated with client`);
    
    setProjects(prevProjects => prevProjects.filter(project => project.clientId !== id));
    
    // Delete all tasks associated with the client's projects
    const tasksToDelete = tasks.filter(task => clientProjectIds.includes(task.projectId));
    console.log(`Deleting ${tasksToDelete.length} tasks associated with client projects`);
    
    setTasks(prevTasks => prevTasks.filter(task => !clientProjectIds.includes(task.projectId)));
    
    // Delete all time entries related to this client
    const timeEntriesToDelete = timeEntries.filter(entry => entry.clientId === id);
    console.log(`Deleting ${timeEntriesToDelete.length} time entries associated with client`);
    
    setTimeEntries(prevEntries => prevEntries.filter(entry => entry.clientId !== id));
    
    // Delete all client agreements
    const agreementsToDelete = clientAgreements.filter(agreement => agreement.clientId === id);
    console.log(`Deleting ${agreementsToDelete.length} agreements associated with client`);
    
    setClientAgreements(prevAgreements => prevAgreements.filter(agreement => agreement.clientId !== id));
    
    // Update users who were associated with this client (remove clientId)
    const usersToUpdate = users.filter(user => user.clientId === id);
    console.log(`Updating ${usersToUpdate.length} users associated with client`);
    
    setUsers(prevUsers => prevUsers.map(user => 
      user.clientId === id ? { ...user, clientId: undefined, clientRole: undefined } : user
    ));
    
    // Finally delete the client itself
    console.log(`Removing client from clients array`);
    setClients(prevClients => prevClients.filter(client => client.id !== id));
    
    // If user is viewing a deleted client, navigate away
    if (window.location.pathname.includes(`/clients/${id}`)) {
      console.log(`Navigating away from deleted client page`);
      navigate('/clients');
    }
  };
  
  // Client agreement operations
  const addClientAgreement = (agreement: Omit<ClientAgreement, "id" | "createdAt">) => {
    const newAgreement: ClientAgreement = {
      id: uuidv4(),
      ...agreement,
      createdAt: new Date().toISOString()
    };
    setClientAgreements(prevAgreements => [...prevAgreements, newAgreement]);
  };
  
  const updateClientAgreement = (id: string, updates: Partial<ClientAgreement>) => {
    setClientAgreements(prevAgreements =>
      prevAgreements.map(agreement => (agreement.id === id ? { ...agreement, ...updates } : agreement))
    );
  };
  
  const deleteClientAgreement = (id: string) => {
    setClientAgreements(prevAgreements => prevAgreements.filter(agreement => agreement.id !== id));
  };
  
  const getClientAgreements = (clientId: string) => {
    return clientAgreements.filter(agreement => agreement.clientId === clientId);
  };
  
  // CRUD operations for projects
  const addProject = (project: Omit<Project, "id">) => {
    const newProject: Project = {
      id: uuidv4(),
      ...project
    };
    setProjects(prevProjects => [...prevProjects, newProject]);
  };
  
  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prevProjects =>
      prevProjects.map(project => (project.id === id ? { ...project, ...updates } : project))
    );
  };
  
  const deleteProject = (id: string) => {
    setProjects(prevProjects => prevProjects.filter(project => project.id !== id));
  };
  
  const watchProject = (projectId: string, userId: string) => {
    setProjects(prevProjects =>
      prevProjects.map(project => {
        if (project.id === projectId) {
          const watcherIds = project.watcherIds || [];
          if (!watcherIds.includes(userId)) {
            // Add task log for watching
            addTaskLog(projectId, userId, `Started watching this project`);
            return { ...project, watcherIds: [...watcherIds, userId] };
          }
        }
        return project;
      })
    );
  };
  
  const unwatchProject = (projectId: string, userId: string) => {
    setProjects(prevProjects =>
      prevProjects.map(project => {
        if (project.id === projectId) {
          let watcherIds = project.watcherIds || [];
          watcherIds = watcherIds.filter(id => id !== userId);
          return { ...project, watcherIds: watcherIds };
        }
        return project;
      })
    );
  };
  
  const convertProjectToTemplate = (projectId: string, templateName: string, templateDescription: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const templateTasks = tasks.filter(task => task.projectId === projectId).map(task => ({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        subtasks: [],
      }));
      
      const newTemplate: ProjectTemplate = {
        id: uuidv4(),
        name: templateName,
        description: templateDescription,
        serviceType: project.serviceType,
        allocatedHours: project.allocatedHours,
        tasks: templateTasks,
        usageCount: 0,
        createdBy: currentUser?.id || 'system',
        createdAt: new Date().toISOString(),
      };
      
      setProjectTemplates(prevTemplates => [...prevTemplates, newTemplate]);
      deleteProject(projectId);
      setTasks(prevTasks => prevTasks.filter(task => task.projectId !== projectId));
    }
  };
  
  // Project template operations
  const addProjectTemplate = (template: Omit<ProjectTemplate, "id" | "usageCount" | "createdAt">) => {
    const newTemplate: ProjectTemplate = {
      id: uuidv4(),
      ...template,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    setProjectTemplates(prevTemplates => [...prevTemplates, newTemplate]);
  };
  
  const updateProjectTemplate = (id: string, updates: Partial<ProjectTemplate>) => {
    setProjectTemplates(prevTemplates =>
      prevTemplates.map(template => (template.id === id ? { ...template, ...updates } : template))
    );
  };
  
  const deleteProjectTemplate = (id: string) => {
    setProjectTemplates(prevTemplates => prevTemplates.filter(template => template.id !== id));
  };
  
  const createProjectFromTemplate = (templateId: string, projectData: {
    name: string;
    clientId: string;
    startDate: string;
    dueDate?: string;
    memberIds?: string[];  // Added memberIds parameter
  }) => {
    const template = projectTemplates.find(t => t.id === templateId);
    if (template) {
      const newProject: Project = {
        id: uuidv4(),
        name: projectData.name,
        description: template.description,
        clientId: projectData.clientId,
        teamIds: template.teamIds || [],
        memberIds: projectData.memberIds,
        taskIds: [],
        startDate: projectData.startDate,
        dueDate: projectData.dueDate,
        status: 'todo',
        serviceType: template.serviceType,
        allocatedHours: template.allocatedHours,
        usedHours: 0,
      };
      
      setProjects(prevProjects => [...prevProjects, newProject]);
      
      template.tasks.forEach(templateTask => {
        const newTask: Task = {
          id: uuidv4(),
          title: templateTask.title,
          description: templateTask.description,
          projectId: newProject.id,
          assigneeId: currentUser?.id,
          collaboratorIds: [],
          status: templateTask.status,
          priority: templateTask.priority,
          dueDate: projectData.dueDate,
          createdAt: new Date().toISOString(),
          customFields: {},
          subtasks: [],
          timeEntries: [],
          comments: [],
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
      });
      
      updateProjectTemplate(templateId, { usageCount: (template.usageCount || 0) + 1 });
    }
  };
  
  // CRUD operations for tasks
  const addTask = (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => {
    const newTask: Task = {
      id: uuidv4(),
      ...task,
      createdAt: new Date().toISOString(),
      timeEntries: [],
      comments: [],
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
  };
  
  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === id ? { ...task, ...updates } : task))
    );
  };
  
  const deleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };
  
  const moveTask = (taskId: string, newStatus: Task["status"], newProjectId?: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: newStatus,
            projectId: newProjectId !== undefined ? newProjectId : task.projectId,
          };
        }
        return task;
      })
    );
  };
  
  const watchTask = (taskId: string, userId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const watcherIds = task.watcherIds || [];
          if (!watcherIds.includes(userId)) {
            // Add task log for watching
            addTaskLog(taskId, userId, `Started watching this task`);
            return { ...task, watcherIds: [...watcherIds, userId] };
          }
        }
        return task;
      })
    );
  };
  
  const unwatchTask = (taskId: string, userId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          let watcherIds = task.watcherIds || [];
          if (watcherIds.includes(userId)) {
            // Add task log for unwatching
            addTaskLog(taskId, userId, `Stopped watching this task`);
          }
          watcherIds = watcherIds.filter(id => id !== userId);
          return { ...task, watcherIds: watcherIds };
        }
        return task;
      })
    );
  };
  
  const linkTasks = (taskId: string, relatedTaskId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const relatedTaskIds = task.relatedTaskIds || [];
          if (!relatedTaskIds.includes(relatedTaskId)) {
            // Add a task log for linking
            addTaskLog(taskId, currentUser?.id, `Linked to task ${relatedTaskId}`);
            return { ...task, relatedTaskIds: [...relatedTaskIds, relatedTaskId] };
          }
        }
        return task;
      });
    });
  };
  
  const unlinkTasks = (taskId: string, relatedTaskId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const relatedTaskIds = task.relatedTaskIds || [];
          const newRelatedIds = relatedTaskIds.filter(id => id !== relatedTaskId);
          
          // Add a task log for unlinking
          addTaskLog(taskId, currentUser?.id, `Unlinked from task ${relatedTaskId}`);
          
          return { ...task, relatedTaskIds: newRelatedIds };
        }
        return task;
      });
    });
  };
  
  const uploadTaskFile = async (taskId: string, file: File, userId: string) => {
    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 10MB limit");
    }
    
    const newFileId = uuidv4();
    const newFile = {
      id: newFileId,
      taskId: taskId,
      name: file.name,
      path: `uploads/${taskId}/${newFileId}`,
      type: file.type,
      sizeKb: file.size / 1024,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId
    };
    
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const files = task.files || [];
          
          // Add a task log for file upload
          addTaskLog(taskId, userId, `Uploaded file: ${file.name}`);
          
          return { ...task, files: [...files, newFile] };
        }
        return task;
      });
    });
    
    return newFile;
  };
  
  const deleteTaskFile = async (taskId: string, fileId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const files = task.files || [];
          const fileToDelete = files.find(f => f.id === fileId);
          
          // Add a task log for file deletion
          if (fileToDelete) {
            addTaskLog(taskId, currentUser?.id, `Deleted file: ${fileToDelete.name}`);
          }
          
          return { 
            ...task, 
            files: files.filter(f => f.id !== fileId) 
          };
        }
        return task;
      });
    });
  };
  
  const addComment = (taskId: string, userId: string, content: string, mentionedUserIds?: string[]) => {
    const newComment: Comment = {
      id: uuidv4(),
      taskId,
      userId,
      content,
      timestamp: new Date().toISOString(),
      mentionedUserIds
    };
    
    // Add the comment to the task
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const comments = task.comments || [];
          
          // Add a task log for the comment
          addTaskLog(taskId, userId, `Added a comment`, content);
          
          return { ...task, comments: [...comments, newComment] };
        }
        return task;
      });
    });
    
    return newComment.id;
  };
  
  const createMessage = (message: Omit<Message, "id" | "read">) => {
    const newMessage: Message = {
      id: uuidv4(),
      ...message,
      read: false
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    return newMessage;
  };
  
  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  };
  
  const deleteTimeEntry = (id: string) => {
    // If this is the active time entry, clear it
    if (activeTimeEntry && activeTimeEntry.id === id) {
      setActiveTimeEntry(null);
    }
    
    setTimeEntries(prev => prev.filter(entry => entry.id !== id));
  };
  
  const updateTimeEntryStatus = (id: string, status: TimeEntryStatus, approvedBy: string, declineReason?: string) => {
    setTimeEntries(prev => prev.map(entry => 
      entry.id === id ? { 
        ...entry, 
        status, 
        approvedBy, 
        approvedDate: new Date().toISOString(),
        declineReason: status === "declined" ? declineReason : undefined 
      } : entry
    ));
  };
  
  // Message operations
  const sendMessage = (message: Omit<Message, "id" | "timestamp" | "read">) => {
    const newMessage: Message = {
      id: uuidv4(),
      ...message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };
  
  const markMessageAsRead = (id: string) => {
    setMessages(prevMessages =>
      prevMessages.map(message => (message.id === id ? { ...message, read: true } : message))
    );
  };
  
  const addTimeEntry = (entry: Omit<TimeEntry, "id">) => {
    const newTimeEntry = createTimeEntry(entry);
    setTimeEntries(prevEntries => [...prevEntries, newTimeEntry]);
  };
  
  const startTimeTracking = (taskId?: string, projectId?: string, clientId?: string) => {
    if (activeTimeEntry) {
      stopTimeTracking();
    }
    
    if (!currentUser) {
      console.error("No current user logged in.");
      return;
    }
    
    if (!clientId) {
      console.error("Client ID is required to start time tracking.");
      return;
    }
    
    const now = new Date();
    const newEntry: TimeEntry = {
      id: uuidv4(),
      taskId,
      projectId,
      clientId,
      userId: currentUser.id,
      startTime: now.toISOString(),
      duration: 0,
      billable: true,
      status: 'pending',
      manuallyAdded: false,
      edited: false
    };
    
    setActiveTimeEntry(newEntry);
    setTimeEntries(prevEntries => [...prevEntries, newEntry]);
  };
  
  const stopTimeTracking = (notes?: string) => {
    if (!activeTimeEntry) return;
    
    const now = new Date();
    const startTime = new Date(activeTimeEntry.startTime);
    const duration = Math.round((now.getTime() - startTime.getTime()) / 60000);
    
    const updatedEntry: TimeEntry = {
      ...activeTimeEntry,
      endTime: now.toISOString(),
      duration: duration > 0 ? duration : 1,
      notes: notes || activeTimeEntry.notes,
    };
    
    setTimeEntries(prevEntries =>
      prevEntries.map(entry => (entry.id === activeTimeEntry.id ? updatedEntry : entry))
    );
    setActiveTimeEntry(null);
  };
  
  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      id: uuidv4(),
      ...purchase
    };
    setPurchases(prevPurchases => [...prevPurchases, newPurchase]);
  };
  
  const addCustomField = (field: Omit<CustomField, "id">) => {
    const newField: CustomField = {
      id: uuidv4(),
      ...field
    };
    setCustomFields(prevFields => [...prevFields, newField]);
  };
  
  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(prevFields =>
      prevFields.map(field => (field.id === id ? { ...field, ...updates } : field))
    );
  };
  
  const deleteCustomField = (id: string) => {
    setCustomFields(prevFields => prevFields.filter(field => field.id !== id));
  };
  
  const updateManagerNotificationPreferences = (userId: string, preferences: User['notificationPreferences']) => {
    setUsers(prevUsers =>
      prevUsers.map(user => (user.id === userId ? { ...user, notificationPreferences: preferences } : user))
    );
  };
  
  const getTasksDueWithinTimeframe = (timeframe: string) => {
    const today = new Date();
    let futureDate = new Date();
    
    switch (timeframe) {
      case 'same-day':
        break;
      case '1-day':
        futureDate.setDate(today.getDate() + 1);
        break;
      case '3-days':
        futureDate.setDate(today.getDate() + 3);
        break;
      case '1-week':
        futureDate.setDate(today.getDate() + 7);
        break;
      default:
        return [];
    }
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      
      if (timeframe === 'same-day') {
        return (
          dueDate.getFullYear() === today.getFullYear() &&
          dueDate.getMonth() === today.getMonth() &&
          dueDate.getDate() === today.getDate()
        );
      }
      
      return dueDate <= futureDate && dueDate >= today;
    });
  };
  
  // Filtering and retrieval
  const getTasksByProject = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId);
  };
  
  const getTasksByUser = (userId: string) => {
    return tasks.filter(task => task.assigneeId === userId);
  };
  
  const getUnreadMessageCount = (userId: string) => {
    return messages.filter(message => message.recipientIds.includes(userId) && !message.read).length;
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
  
  const getClientAgreementById = (id: string) => {
    return clientAgreements.find(agreement => agreement.id === id);
  };
  
  // Client file management
  const getClientFiles = (clientId: string) => {
    // Placeholder implementation - replace with actual logic
    return [];
  };
  
  const uploadClientFile = async (clientId: string, file: File): Promise<ClientFile> => {
    // Placeholder implementation - replace with actual logic
    console.log(`Uploading file ${file.name} for client ${clientId}`);
    
    const newFile: ClientFile = {
      id: uuidv4(),
      clientId: clientId,
      name: file.name,
      path: 'placeholder/path',
      type: file.type,
      sizeKb: file.size / 1024,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.id || 'unknown',
    };
    
    // Here you would typically upload the file to a server
    // and then update the state with the new file details
    return Promise.resolve(newFile);
  };
  
  const deleteClientFile = async (clientId: string, fileId: string): Promise<void> => {
    // Placeholder implementation - replace with actual logic
    console.log(`Deleting file ${fileId} for client ${clientId}`);
    return Promise.resolve();
  };
  
  const contextValue: AppContextType = {
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
    taskLogs,
    notes,
    currentUser,
    activeTimeEntry,
    login,
    logout,
    inviteUser,
    addCustomRole,
    updateCustomRole,
    deleteCustomRole,
    assignRoleToUser,
    addUser,
    updateUser,
    deleteUser,
    addTeam,
    updateTeam,
    deleteTeam,
    addClient,
    updateClient,
    deleteClient,
    addClientAgreement,
    updateClientAgreement,
    deleteClientAgreement,
    getClientAgreements,
    addProject,
    updateProject,
    deleteProject,
    watchProject,
    unwatchProject,
    convertProjectToTemplate,
    addProjectTemplate,
    updateProjectTemplate,
    deleteProjectTemplate,
    createProjectFromTemplate,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    watchTask,
    unwatchTask,
    linkTasks, 
    unlinkTasks,
    uploadTaskFile,
    deleteTaskFile,
    startTimeTracking,
    stopTimeTracking,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    updateTimeEntryStatus,
    sendMessage,
    markMessageAsRead,
    addComment,
    createMessage,
    addPurchase,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    updateManagerNotificationPreferences,
    getTasksDueWithinTimeframe,
    getTasksByProject,
    getTasksByUser,
    getUnreadMessageCount,
    getUserById,
    getProjectById,
    getClientById,
    getTaskById,
    getClientAgreementById,
    getClientFiles,
    uploadClientFile,
    deleteClientFile,
    addNote,
    updateNote,
    archiveNote,
    unarchiveNote,
    deleteNote,
    updateNotePosition,
    getNotesByUser,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
