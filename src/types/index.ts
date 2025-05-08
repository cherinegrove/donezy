
export type Role = 'admin' | 'manager' | 'developer' | 'client';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type ServiceType = 'project' | 'bank-hours' | 'pay-as-you-go';

export type NotificationTimeframe = 'same-day' | '1-day' | '3-days' | '1-week';

export type EmploymentType = 'full-time' | 'contract' | 'part-time';

export type BillingType = 'hourly' | 'monthly';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  teamIds: string[];
  phone?: string; // Added phone field
  employmentType?: EmploymentType;
  billingType?: BillingType;
  billingRate?: number;
  currency?: string;
  managerId?: string; // ID of the user's manager
  clientId?: string; // If user is a client user, associated client ID
  jobTitle?: string; // Job title for client users
  projectAccess?: string[]; // Projects the client user can access
  watchedTaskIds?: string[]; // Tasks that the user is watching
  notificationPreferences?: {
    taskDue?: NotificationTimeframe[];
    taskStatusChange?: boolean;
    newComments?: boolean;
    timeTracking?: boolean;
    notificationSettings?: { // Added notificationSettings structure
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
}

export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
  projectIds: string[];
}

export interface Client {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  projectIds: string[];
  userId?: string; // If client has user access
  billableRate: number; // Hourly rate for billing
  currency: string;  // Currency code (USD, EUR, etc)
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  teamIds: string[];
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
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[]; // For select and multiselect types
  required: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  parentTaskId?: string;
  assigneeIds: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  customFields: Record<string, any>;
  subtasks: string[]; // Task IDs
  timeEntries: TimeEntry[];
  comments: Comment[];
  watcherIds?: string[]; // Users watching this task
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number; // In minutes
  notes?: string;
  billable: boolean;
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
