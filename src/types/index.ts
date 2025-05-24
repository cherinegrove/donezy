
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  teamIds?: string[];
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
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  createdAt: string;
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
}

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
  status?: 'pending' | 'approved' | 'rejected';
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
}

export interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: string;
}
