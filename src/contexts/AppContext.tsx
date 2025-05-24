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
  notes: []
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
        .select(`name, email, avatar_url, role`)
        .eq('id', session?.user?.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setCurrentUser({
          id: session?.user?.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar_url,
          role: data.role,
        });
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      // setLoading(false)
    }
  }, [session?.user?.id])

  // Set current user
  useEffect(() => {
    if (session?.user) {
      getProfile()
    }
  }, [session, getProfile])

  // Initialize user data - only load if user exists and is authenticated
  useEffect(() => {
    if (currentUser && session) {
      // For new users, start with empty state
      // In a real app, this would load user-specific data from the backend
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
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }, []);

  // CRUD operations for Notes
  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log("Adding note:", note);
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 15),
      ...note,
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

  // CRUD operations for Projects
  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    console.log("Adding project:", project);
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 15),
      ...project,
    };
    setProjects(prev => [...prev, newProject]);
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

  // CRUD operations for Clients
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
    
    // Finally delete the client
    setClients(prev => prev.filter(client => client.id !== clientId));
  }, [projects, deleteProject]);

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
    login,
    logout,
    addNote,
    updateNote,
    deleteNote,
    addProject,
    updateProject,
    deleteProject,
    addClient,
    updateClient,
    deleteClient,
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
