
export interface ProjectTemplateTask {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  orderIndex: number;
  subtasks: ProjectTemplateSubtask[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplateSubtask {
  id: string;
  templateTaskId: string;
  name: string;
  description?: string;
  estimatedHours: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplateWithTasks {
  id: string;
  name: string;
  description: string;
  serviceType: 'project' | 'bank-hours' | 'pay-as-you-go';
  defaultDuration: number;
  allocatedHours: number;
  tasks: ProjectTemplateTask[];
  customFields?: string[];
  teamIds: string[];
  createdBy: string;
  createdAt: string;
  usageCount: number;
}
