
import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole, Note, TaskLog, ClientAgreement, ClientFile, TaskStatusDefinition, ProjectStatusDefinition, CustomField } from "@/types";
import { CustomDashboard, SavedReport } from "@/types/dashboard";
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
  customFields: CustomField[];
  activeTimeEntry: TimeEntry | null;
  isTimerPaused: boolean;
  pausedAt: Date | null;
  totalPausedTime: number;
  taskLogs: TaskLog[];
  taskStatuses: TaskStatusDefinition[];
  projectStatuses: ProjectStatusDefinition[];
  customDashboards: CustomDashboard[];
  savedReports: SavedReport[];
  
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  
  // User functions
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  getUserById: (userId: string) => User | undefined;
  inviteUser: (email: string, name: string, role: string, options?: any) => void;
  updateManagerNotificationPreferences: (preferences: any) => void;
  
  // Team functions
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (teamId: string) => void;
  
  // Client functions
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (clientId: string, updates: Partial<Client>) => void;
  deleteClient: (clientId: string) => void;
  getClientById: (clientId: string) => Client | undefined;
  
  // Project functions
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  getProjectById: (projectId: string) => Project | undefined;
  convertProjectToTemplate: (projectId: string, templateData: { name: string; description: string }) => void;
  watchProject: (projectId: string, userId: string) => void;
  unwatchProject: (projectId: string, userId: string) => void;
  createProjectFromTemplate: (templateId: string, projectData: any) => void;
  
  // Task functions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'timeEntries' | 'comments'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  moveTask: (taskId: string, newStatus: string) => void;
  watchTask: (taskId: string, userId: string) => void;
  unwatchTask: (taskId: string, userId: string) => void;
  linkTasks: (taskId: string, relatedTaskId: string) => void;
  unlinkTasks: (taskId: string, relatedTaskId: string) => void;
  uploadTaskFile: (taskId: string, file: File) => Promise<string>;
  deleteTaskFile: (taskId: string, fileId: string) => void;
  
  // Task Status functions
  addTaskStatus: (status: Omit<TaskStatusDefinition, 'id'>) => void;
  updateTaskStatus: (statusId: string, updates: Partial<TaskStatusDefinition>) => void;
  deleteTaskStatus: (statusId: string) => void;
  reorderTaskStatuses: (statuses: TaskStatusDefinition[]) => void;
  
  // Project Status functions
  addProjectStatus: (status: Omit<ProjectStatusDefinition, 'id'>) => Promise<void>;
  updateProjectStatus: (statusId: string, updates: Partial<ProjectStatusDefinition>) => Promise<void>;
  deleteProjectStatus: (statusId: string) => Promise<void>;
  reorderProjectStatuses: (statuses: ProjectStatusDefinition[]) => Promise<void>;
  
  // TimeEntry functions
  addTimeEntry: (timeEntry: Omit<TimeEntry, 'id'>) => void;
  updateTimeEntry: (timeEntryId: string, updates: Partial<TimeEntry>) => void;
  deleteTimeEntry: (timeEntryId: string) => void;
  startTimeTracking: (taskId: string, projectId?: string, clientId?: string) => void;
  stopTimeTracking: (notes?: string) => void;
  pauseTimeTracking: () => void;
  resumeTimeTracking: () => void;
  updateTimeEntryStatus: (timeEntryId: string, status: string, reason?: string) => void;
  
  // Message functions
  addMessage: (message: Omit<Message, 'id'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => void;
  createMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => void;
  markMessageAsRead: (messageId: string) => void;
  
  // Comment functions
  addComment: (taskId: string, userId: string, content: string, mentionedUserIds?: string[]) => string;
  
  // Note functions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  getNotesByUser: (userId: string) => Note[];
  
  // Custom Role functions
  addCustomRole: (role: Omit<CustomRole, 'id'>) => void;
  updateCustomRole: (roleId: string, updates: Partial<CustomRole>) => void;
  deleteCustomRole: (roleId: string) => void;
  
  // Template functions
  addProjectTemplate: (template: Omit<ProjectTemplate, 'id' | 'createdAt' | 'usageCount'>) => Promise<void>;
  updateProjectTemplate: (templateId: string, updates: Partial<ProjectTemplate>) => Promise<void>;
  deleteProjectTemplate: (templateId: string) => Promise<void>;
  
  // Purchase functions
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (purchaseId: string, updates: Partial<Purchase>) => void;
  deletePurchase: (purchaseId: string) => void;
  
  // Client Agreement functions
  addClientAgreement: (agreement: Omit<ClientAgreement, 'id'>) => void;
  updateClientAgreement: (agreementId: string, updates: Partial<ClientAgreement>) => void;
  deleteClientAgreement: (agreementId: string) => void;
  getClientAgreements: (clientId: string) => ClientAgreement[];
  
  // Client File functions
  uploadClientFile: (clientId: string, file: File) => Promise<void>;
  deleteClientFile: (fileId: string) => void;
  getClientFiles: (clientId: string) => ClientFile[];
  
  // Custom Field functions
  addCustomField: (field: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomField: (fieldId: string, updates: Partial<CustomField>) => void;
  deleteCustomField: (fieldId: string) => void;
  reorderCustomFields: (fields: CustomField[]) => void;
  
  // Dashboard and Report functions
  addCustomDashboard: (dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomDashboard: (dashboardId: string, updates: Partial<CustomDashboard>) => void;
  deleteCustomDashboard: (dashboardId: string) => void;
  setDefaultDashboard: (dashboardId: string) => void;
  saveReport: (report: Omit<SavedReport, 'id' | 'createdAt' | 'updatedAt'>, dashboardId: string) => void;
  updateSavedReport: (reportId: string, updates: Partial<SavedReport>) => void;
  deleteSavedReport: (reportId: string) => void;
}
