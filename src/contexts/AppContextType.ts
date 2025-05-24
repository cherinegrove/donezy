import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole, Note } from "@/types";
import { Session } from "@supabase/supabase-js";

export interface AppContextType {
  currentUser: User | null;
  session: Session | null;
  users: User[];
  teams: Team[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  messages: Message[];
  purchases: Purchase[];
  projectTemplates: ProjectTemplate[];
  customRoles: CustomRole[];
  comments: any[];
  notes: Note[];
  
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  
  // User functions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  
  // Team functions
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (teamId: string) => void;
  
  // Task functions
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  
  // TimeEntry functions
  addTimeEntry: (timeEntry: Omit<TimeEntry, 'id'>) => void;
  updateTimeEntry: (timeEntryId: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (timeEntryId: string) => void;
  
  // Message functions
  addMessage: (message: Omit<Message, 'id'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  
  // Purchase functions
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (purchaseId: string, updates: Partial<Purchase>) => void;
  deletePurchase: (purchaseId: string) => void;
  
  // ProjectTemplate functions
  addProjectTemplate: (projectTemplate: Omit<ProjectTemplate, 'id'>) => void;
  updateProjectTemplate: (projectTemplateId: string, updates: Partial<ProjectTemplate>) => void;
  deleteProjectTemplate: (projectTemplateId: string) => void;
  
  // CustomRole functions
  addCustomRole: (customRole: Omit<CustomRole, 'id'>) => void;
  updateCustomRole: (customRoleId: string, updates: Partial<CustomRole>) => void;
  deleteCustomRole: (customRoleId: string) => void;
  
  // Comment functions
  addComment: (comment: Omit<any, 'id'>) => void;
  updateComment: (commentId: string, updates: Partial<any>) => void;
  deleteComment: (commentId: string) => void;
  
  // Note functions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  
  // Project functions
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  
  // Client functions
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  deleteClient: (clientId: string) => void;
}
