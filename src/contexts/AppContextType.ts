
import {
  User, Team, Client, Project, Task, TimeEntry, Comment, Message, Purchase, CustomField, ProjectTemplate, CustomRole, ClientFile, ClientAgreement, TimeEntryStatus, TaskLog
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
  customRoles: CustomRole[];
  clientAgreements: ClientAgreement[];
  taskLogs: TaskLog[];  // Added task logs
  
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
    hourlyRate?: number;
    monthlyRate?: number;
    currency?: string;
    teamIds?: string[];
    clientId?: string;
    clientRole?: "admin" | "team";
  }) => void;
  
  // CRUD operations for teams
  addTeam: (team: Omit<Team, "id">) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  
  // CRUD operations for clients
  addClient: (client: Omit<Client, "id">) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Client agreement operations
  addClientAgreement: (agreement: Omit<ClientAgreement, "id" | "createdAt">) => void;
  updateClientAgreement: (id: string, updates: Partial<ClientAgreement>) => void;
  deleteClientAgreement: (id: string) => void;
  getClientAgreements: (clientId: string) => ClientAgreement[];
  
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
    memberIds?: string[];
  }) => void;
  
  // CRUD operations for tasks
  addTask: (task: Omit<Task, "id" | "createdAt" | "timeEntries" | "comments">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: Task["status"], newProjectId?: string) => void;
  watchTask: (taskId: string, userId: string) => void;
  unwatchTask: (taskId: string, userId: string) => void;
  linkTasks: (taskId: string, relatedTaskId: string) => void; // Added for linking tasks
  unlinkTasks: (taskId: string, relatedTaskId: string) => void; // Added for unlinking tasks
  
  // File operations
  uploadTaskFile: (taskId: string, file: File, userId: string) => Promise<any>; // Added for file uploads
  deleteTaskFile: (taskId: string, fileId: string) => Promise<void>; // Added for file deletion
  
  // Time tracking operations
  startTimeTracking: (taskId?: string, projectId?: string, clientId?: string) => void;
  stopTimeTracking: (notes?: string) => void;
  addTimeEntry: (entry: Omit<TimeEntry, "id">) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  updateTimeEntryStatus: (id: string, status: TimeEntryStatus, approvedBy: string) => void;
  
  // Message operations
  sendMessage: (message: Omit<Message, "id" | "timestamp" | "read">) => void;
  markMessageAsRead: (id: string) => void;
  addComment: (taskId: string, userId: string, content: string, mentionedUserIds?: string[]) => string; // Updated signature
  createMessage: (message: Omit<Message, "id" | "read">) => void; // Added for creating messages
  
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
  getClientAgreementById: (id: string) => ClientAgreement | undefined;
  
  // Client file management
  getClientFiles: (clientId: string) => ClientFile[];
  uploadClientFile: (clientId: string, file: File) => Promise<ClientFile>;
  deleteClientFile: (clientId: string, fileId: string) => Promise<void>;
}
