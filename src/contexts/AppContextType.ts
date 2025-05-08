import {
  User, Team, Client, Project, Task, TimeEntry, Message, Purchase, CustomField, ProjectTemplate, CustomRole
} from "@/types";

export interface AppContextType {
  // Data
  users: User[];
  teams: Team[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  messages: Message[];
  purchases: Purchase[];
  customFields: CustomField[];
  projectTemplates: ProjectTemplate[];
  customRoles: CustomRole[];  // Added for roles management
  
  // Current user and active states
  currentUser: User | null;
  activeTimeEntry: TimeEntry | null;
  
  // Authentication
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Role management operations
  addCustomRole: (role: Omit<CustomRole, "id">) => void;
  updateCustomRole: (id: string, updates: Partial<CustomRole>) => void;
  deleteCustomRole: (id: string) => void;
  assignRoleToUser: (userId: string, roleId: string) => void;
  
  // CRUD operations for users
  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  inviteUser: (email: string, name: string, role: string, options?: {
    phone?: string;
    employmentType?: "full-time" | "part-time" | "contract";
    billingType?: "hourly" | "monthly";
    billingRate?: number;
    currency?: string;
    teamIds?: string[];
    clientId?: string;
    clientRole?: "admin" | "team";  // Added clientRole option
  }) => void;
  
  // CRUD operations for teams
  addTeam: (team: Omit<Team, "id">) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  
  // CRUD operations for clients
  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // CRUD operations for projects
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  watchProject: (projectId: string, userId: string) => void;
  unwatchProject: (projectId: string, userId: string) => void;
  convertProjectToTemplate: (projectId: string, templateName: string, templateDescription: string) => void;
  
  // Project template operations
  addProjectTemplate: (template: Omit<ProjectTemplate, "id" | "usageCount" | "createdAt">) => void;
  updateProjectTemplate: (id: string, updates: Partial<ProjectTemplate>) => void;
  deleteProjectTemplate: (id: string) => void;
  createProjectFromTemplate: (templateId: string, projectData: {
    name: string;
    clientId: string;
    startDate: string;
    dueDate?: string;
  }) => void;
  
  // CRUD operations for tasks
  addTask: (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: Task["status"], newProjectId?: string) => void;
  watchTask: (taskId: string, userId: string) => void;
  unwatchTask: (taskId: string, userId: string) => void;
  
  // Time tracking operations
  startTimeTracking: (taskId: string) => void;
  stopTimeTracking: (notes?: string) => void;
  addTimeEntry: (entry: Omit<TimeEntry, "id">) => void;
  
  // Message operations
  sendMessage: (message: Omit<Message, "id" | "timestamp" | "read">) => void;
  markMessageAsRead: (id: string) => void;
  addComment: (taskId: string, userId: string, content: string) => any;
  
  // Purchase operations
  addPurchase: (purchase: Omit<Purchase, "id">) => void;
  
  // Custom field operations
  addCustomField: (field: Omit<CustomField, "id">) => void;
  updateCustomField: (id: string, updates: Partial<CustomField>) => void;
  deleteCustomField: (id: string) => void;
  
  // Manager operations
  updateManagerNotificationPreferences: (userId: string, preferences: User['notificationPreferences']) => void;
  getTasksDueWithinTimeframe: (timeframe: string) => Task[];
  
  // Filtering and retrieval
  getTasksByProject: (projectId: string) => Task[];
  getTasksByUser: (userId: string) => Task[];
  getUnreadMessageCount: (userId: string) => number;
  getUserById: (id: string) => User | undefined;
  getProjectById: (id: string) => Project | undefined;
  getClientById: (id: string) => Client | undefined;
  getTaskById: (id: string) => Task | undefined;
}
