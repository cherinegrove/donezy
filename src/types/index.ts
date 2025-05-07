
export type Role = 'admin' | 'manager' | 'developer' | 'client';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type ServiceType = 'project' | 'bank-hours' | 'pay-as-you-go';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  teamIds: string[];
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
  // Customization options
  kanbanColors?: {
    backlog?: string;
    todo?: string;
    "in-progress"?: string;
    review?: string;
    done?: string;
  };
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
}

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  threadId?: string;
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

