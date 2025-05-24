export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'developer' | 'client';
  teamIds?: string[];
  jobTitle?: string;
  clientId?: string;
  phone?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract';
  billingType?: 'hourly' | 'monthly';
  hourlyRate?: number;
  monthlyRate?: number;
  billingRate?: number;
  currency?: string;
  clientRole?: string;
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
  managerId?: string;
  notificationPreferences?: {
    taskDue?: NotificationTimeframe[];
    taskStatusChange?: boolean;
    newComments?: boolean;
    timeTracking?: boolean;
    notificationSettings?: {
      clients: { new: boolean; updated: boolean };
      projects: { new: boolean; updated: boolean };
      tasks: { new: boolean; updated: boolean };
      subtasks: { new: boolean; updated: boolean };
      mentions: { new: boolean; updated: boolean };
    };
  };
  // Guest-specific fields
  is_guest?: boolean;
  guest_of_user_id?: string;
  guest_permissions?: {
    canViewProjects?: boolean;
    canViewTasks?: boolean;
    canEditTasks?: boolean;
    canViewClients?: boolean;
    canViewReports?: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  leaderId?: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  billableRate?: number;
  currency?: string;
  serviceType?: 'retainer' | 'payasyougo' | 'bank-hours';
  allocatedHours?: number;
  status?: 'active' | 'inactive';
  memberIds?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  status: 'todo' | 'in-progress' | 'done';
  serviceType: 'project' | 'bank-hours' | 'pay-as-you-go';
  startDate?: string;
  dueDate?: string;
  allocatedHours?: number;
  usedHours: number;
  teamIds?: string[];
  watcherIds?: string[];
  templateId?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  mentionedUserIds?: string[];
}

export interface TaskFile {
  id: string;
  name: string;
  url: string;
  size: number;
  sizeKb: number;
  uploadedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  parentTaskId?: string;
  assigneeId?: string;
  collaboratorIds?: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  startDate?: string;
  dueDate?: string;
  customFields?: Record<string, any>;
  subtasks?: Task[];
  createdAt: string;
  timeEntries?: TimeEntry[];
  comments?: Comment[];
  watcherIds?: string[];
  files?: TaskFile[];
  relatedTaskIds?: string[];
}

export type TimeEntryStatus = 'pending' | 'approved' | 'rejected' | 'approved-billable' | 'approved-non-billable' | 'declined';

export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  projectId?: string;
  clientId?: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  description?: string;
  billable?: boolean;
  status?: TimeEntryStatus;
  notes?: string;
  manuallyAdded?: boolean;
  declineReason?: string;
  edited?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  timestamp: string;
  read: boolean;
  taskId?: string;
  projectId?: string;
  commentId?: string;
}

export interface Purchase {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  receipt?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  serviceType: 'project' | 'bank-hours' | 'pay-as-you-go';
  defaultDuration: number;
  allocatedHours: number;
  tasks: TemplateTask[];
  createdBy: string;
  createdAt: string;
  usageCount: number;
  teamIds?: string[];
}

export interface TemplateTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  subtasks?: TemplateTask[];
}

export interface CustomRole {
  id: string;
  name: string;
  permissions: Record<string, AccessLevel>;
  description?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  archived?: boolean;
}

export interface TaskLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: string;
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
}

export interface ClientFile {
  id: string;
  clientId: string;
  name: string;
  sizeKb: number;
  uploadedAt: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  options?: string[];
  required: boolean;
}

export type NotificationTimeframe = 'same-day' | '1-day' | '3-days' | '1-week';
export type AccessLevel = 'none' | 'view' | 'create' | 'edit' | 'delete';
export type BillingType = 'hourly' | 'monthly';
export type EmploymentType = 'full-time' | 'part-time' | 'contract';
export type Role = 'admin' | 'manager' | 'developer' | 'client';
export type ClientRole = 'primary' | 'secondary' | 'viewer';

export interface AccountSubscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'paid';
  max_users: number;
  max_guests: number;
  additional_guests: number;
  monthly_cost: number;
  stripe_subscription_id?: string;
  status: 'active' | 'cancelled' | 'past_due';
  created_at: string;
  updated_at: string;
}

export interface AccountLimits {
  max_users: number;
  max_guests: number;
  current_users: number;
  current_guests: number;
  can_add_user: boolean;
  can_add_guest: boolean;
}

// Utility functions for permission checking
export const hasPermission = (userRole: CustomRole | undefined, feature: string, requiredLevel: AccessLevel): boolean => {
  if (!userRole) return false;
  
  const userLevel = userRole.permissions[feature];
  if (!userLevel || userLevel === 'none') return false;
  
  const levels = ['none', 'view', 'create', 'edit', 'delete'];
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
};

export const getGuestPermissions = (): Record<string, AccessLevel> => {
  return {
    dashboard: 'none',
    projects: 'view',
    tasks: 'edit',
    timeTracking: 'none',
    clients: 'none',
    teams: 'none',
    users: 'none',
    reports: 'none',
    messages: 'none',
    notes: 'none',
    settings: 'none'
  };
};
