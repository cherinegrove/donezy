export type Role = 'admin' | 'manager' | 'developer' | 'client';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type ServiceType = 'project' | 'bank-hours' | 'pay-as-you-go';

export type NotificationTimeframe = 'same-day' | '1-day' | '3-days' | '1-week';

export type EmploymentType = 'full-time' | 'contract' | 'part-time';

export type BillingType = 'hourly' | 'monthly';

export type AccessLevel = 'none' | 'view' | 'edit';

export type ClientRole = 'admin' | 'team';  // Added ClientRole type

export type TimeEntryStatus = 'pending' | 'approved-billable' | 'approved-non-billable' | 'declined';

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: {
    accountSettings: AccessLevel;
    reports: AccessLevel;
    timeTracking: AccessLevel;
    clients: AccessLevel;
    projects: AccessLevel;
    tasks: AccessLevel;
    users: AccessLevel;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  teamIds: string[];
  phone?: string;
  employmentType?: EmploymentType;
  billingType?: BillingType;
  billingRate?: number;
  hourlyRate?: number;  // For hourly employees
  monthlyRate?: number; // For monthly employees
  currency?: string;
  managerId?: string;
  clientId?: string;
  clientRole?: ClientRole;  // Added client role field
  jobTitle?: string;
  projectAccess?: string[];
  watchedTaskIds?: string[];
  notificationPreferences?: {
    taskDue?: NotificationTimeframe[];
    taskStatusChange?: boolean;
    newComments?: boolean;
    timeTracking?: boolean;
    notificationSettings?: {
      clients: {
        new: boolean;
        updated: boolean;
      };
      projects: {
        new: boolean;
        updated: boolean;
      };
      tasks: {
        new: boolean;
        updated: boolean;
      };
      subtasks: {
        new: boolean;
        updated: boolean;
      };
      mentions: {
        new: boolean;
        updated: boolean;
      };
    };
  };
  permissions?: {
    canViewClients?: boolean;
    canEditClients?: boolean;
    canViewProjects?: boolean;
    canEditProjects?: boolean;
    canViewTasks?: boolean;
    canEditTasks?: boolean;
    canViewReports?: boolean;
    canManageUsers?: boolean;
  };
  customRoleId?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
  projectIds: string[];
}

export interface ClientFile {
  id: string;
  clientId: string;
  name: string;
  path: string;
  type: string;
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ClientAgreement {
  id: string;
  clientId: string;
  serviceType: 'retainer' | 'payasyougo' | 'bank-hours';
  startDate: string;
  endDate?: string;
  allocatedHours?: number;
  usedHours?: number;
  rate: number;
  currency: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  projectIds: string[];
  userId?: string;
  billableRate: number;
  currency: string;
  status: 'active' | 'inactive';
  files?: ClientFile[];
  serviceType?: 'retainer' | 'payasyougo' | 'bank-hours';  // Current service type
  allocatedHours?: number;  // Current allocated hours
  usedHours?: number;  // Current used hours
  teamIds?: string[];  // Teams assigned to this client
  memberIds?: string[];  // Individual team members assigned to this client
  notes?: string;
  agreements?: string[];  // IDs of client agreements
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  teamIds: string[];
  memberIds?: string[];  // Added: individual team members assigned to this project
  taskIds: string[];
  startDate: string;
  dueDate?: string;
  status: TaskStatus;
  serviceType: ServiceType;
  allocatedHours?: number;
  usedHours: number;
  watcherIds?: string[]; // Users watching this project
  // Customization options
  kanbanColors?: {
    backlog?: string;
    todo?: string;
    "in-progress"?: string;
    review?: string;
    done?: string;
  };
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  serviceType: ServiceType;
  defaultDuration?: number; // In days
  allocatedHours?: number;
  tasks: TemplateTask[];
  teamIds?: string[];
  usageCount: number;
  createdBy: string; // User ID
  createdAt: string;
}

export interface TemplateTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  subtasks: TemplateSubtask[];
  dependency?: string; // ID of the task this task depends on
}

export interface TemplateSubtask {
  title: string;
  description: string;
  estimatedHours?: number;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'dropdown' | 'file-upload';
  options?: string[]; // For select and multiselect types
  required: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  parentTaskId?: string;
  assigneeId?: string;  // Single assignee (owner)
  collaboratorIds: string[]; // Multiple collaborators
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  startDate?: string;
  createdAt: string;
  customFields: Record<string, any>;
  subtasks: string[]; // Task IDs
  timeEntries: TimeEntry[];
  comments: Comment[];
  watcherIds?: string[]; // Users watching this task
}

export interface TimeEntry {
  id: string;
  taskId?: string;  // Optional task ID
  projectId?: string; // Optional project ID
  clientId: string; // Client ID is required
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number; // In minutes
  notes?: string;
  billable: boolean;
  status: TimeEntryStatus; // Added status field
  manuallyAdded?: boolean; // Flag for manual entries
  edited?: boolean; // Flag for edited entries
  approvedBy?: string; // ID of user who approved/declined the entry
  approvedDate?: string; // Date when the entry was approved/declined
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  timestamp: string;
  attachments?: string[];
  mentionedUserIds?: string[]; // Added to track mentioned users
}

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  timestamp: string;
  read: boolean;
  commentId: string; // Reference to the comment that created this message
  taskId: string;    // Reference to related task
  projectId?: string; // Reference to related project
  clientId?: string;  // Reference to related client
}

export interface Purchase {
  id: string;
  clientId: string;
  serviceType: ServiceType;
  hours?: number;
  amount: number;
  date: string;
  projectId?: string;
  description: string;
}
