import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, ProjectTemplate, CustomRole } from "@/types";

// Built-in roles
const ADMIN_ROLE_ID = 'admin-role';
const USER_ROLE_ID = 'user-role';

export const mockCustomRoles: CustomRole[] = [
  {
    id: ADMIN_ROLE_ID,
    name: 'Admin',
    description: 'Full administrative access to all features',
    isBuiltIn: true,
    color: '#dc2626',
    permissions: {
      dashboard: 'edit',
      projects: 'delete',
      tasks: 'delete',
      timeTracking: 'delete',
      clients: 'delete',
      teams: 'delete',
      users: 'delete',
      reports: 'delete',
      messages: 'delete',
      notes: 'delete',
      settings: 'delete'
    }
  },
  {
    id: USER_ROLE_ID,
    name: 'User',
    description: 'Standard user access with basic permissions',
    isBuiltIn: true,
    color: '#2563eb',
    permissions: {
      dashboard: 'view',
      projects: 'view',
      tasks: 'edit',
      timeTracking: 'edit',
      clients: 'view',
      teams: 'view',
      users: 'view',
      reports: 'view',
      messages: 'edit',
      notes: 'edit',
      settings: 'view'
    }
  },
  {
    id: 'project-manager',
    name: 'Project Manager',
    description: 'Can manage projects and oversee team progress',
    color: '#059669',
    permissions: {
      dashboard: 'view',
      projects: 'edit',
      tasks: 'edit',
      timeTracking: 'edit',
      clients: 'view',
      teams: 'view',
      users: 'view',
      reports: 'edit',
      messages: 'edit',
      notes: 'edit',
      settings: 'view'
    }
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    description: 'Can manage team tasks and time tracking',
    color: '#7c3aed',
    permissions: {
      dashboard: 'view',
      projects: 'view',
      tasks: 'edit',
      timeTracking: 'edit',
      clients: 'view',
      teams: 'edit',
      users: 'view',
      reports: 'view',
      messages: 'edit',
      notes: 'edit',
      settings: 'view'
    }
  }
];

export const mockUsers: User[] = [
  {
    id: "user-1",
    auth_user_id: "user-1",
    name: "Alex Johnson",
    email: "alex@manex.com",
    avatar: "/placeholder.svg",
    roleId: ADMIN_ROLE_ID,
    status: 'active',
    teamIds: ["team-1"],
  },
  {
    id: "user-2", 
    auth_user_id: "user-2",
    name: "Sam Davis",
    email: "sam@manex.com",
    avatar: "/placeholder.svg",
    roleId: USER_ROLE_ID,
    status: 'active',
    teamIds: ["team-1"],
  },
  {
    id: "user-3",
    auth_user_id: "user-3",
    name: "Taylor Wilson",
    email: "taylor@manex.com",
    avatar: "/placeholder.svg",
    roleId: 'project-manager',
    status: 'active',
    teamIds: ["team-1"],
  },
];

export const mockTeams: Team[] = [
  {
    id: "team-1",
    name: "Core Team",
    description: "Main development team",
    memberIds: ["user-1", "user-2", "user-3"],
  },
];

export const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'Acme Corporation',
    contactName: 'John Smith',
    email: 'john@acme.com',
    phone: '555-1234',
    createdAt: '2024-01-01T00:00:00Z',
    billableRate: 150,
    currency: 'USD',
    status: 'active'
  },
  {
    id: 'client-2',
    name: 'Globex Industries',
    contactName: 'Jane Doe',
    email: 'jane@globex.com',
    phone: '555-5678',
    createdAt: '2024-01-01T00:00:00Z',
    billableRate: 175,
    currency: 'USD',
    status: 'active'
  },
  {
    id: 'client-3',
    name: 'Initech Solutions',
    contactName: 'Michael Bolton',
    email: 'michael@initech.com',
    phone: '555-9012',
    createdAt: '2024-01-01T00:00:00Z',
    billableRate: 125,
    currency: 'USD',
    status: 'inactive'
  }
];

export const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "Website Redesign",
    description: "Complete overhaul of Acme's corporate website",
    clientId: "client-1",
    teamIds: ["team-1"],
    startDate: "2025-05-01",
    dueDate: "2025-06-30",
    status: "in-progress",
    serviceType: "project",
    allocatedHours: 120,
    usedHours: 45,
  },
  {
    id: "project-2",
    name: "Mobile App Development",
    description: "New mobile app for TechStart Inc",
    clientId: "client-2",
    teamIds: ["team-1"],
    startDate: "2025-05-15",
    dueDate: "2025-08-15",
    status: "todo",
    serviceType: "bank-hours",
    allocatedHours: 200,
    usedHours: 0,
  },
  {
    id: "project-3",
    name: "Initech Project",
    description: "Project for Initech Solutions",
    clientId: "client-3",
    teamIds: ["team-1"],
    startDate: "2025-06-01",
    dueDate: "2025-07-31",
    status: "in-progress",
    serviceType: "project",
    allocatedHours: 150,
    usedHours: 60,
  },
  {
    id: "project-4",
    name: "Globex Project",
    description: "Project for Globex Industries",
    clientId: "client-2",
    teamIds: ["team-1"],
    startDate: "2025-07-01",
    dueDate: "2025-08-31",
    status: "todo",
    serviceType: "project",
    allocatedHours: 200,
    usedHours: 0,
  }
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Design Homepage Layout",
    description: "Create wireframes and design for the new homepage",
    projectId: "project-1",
    assigneeId: "user-2",
    collaboratorIds: ["user-1", "user-3"],
    status: "in-progress",
    priority: "high",
    dueDate: "2025-05-20",
    createdAt: "2025-05-05",
    customFields: {
      "field-1": "Web",
      "field-2": 8,
    },
    timeEntries: [],
    comments: [
      {
        id: "comment-1",
        userId: "user-1",
        content: "Let's make sure we follow the brand guidelines",
        timestamp: "2025-05-06T10:15:00Z",
      },
    ],
  },
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: "time-1",
    taskId: "task-1",
    projectId: "project-1",
    clientId: "client-1",
    userId: "user-2",
    startTime: "2025-05-10T09:00:00Z",
    endTime: "2025-05-10T12:30:00Z",
    duration: 210,
    notes: "Initial wireframing",
    billable: true,
    status: "pending"
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg-1",
    senderId: "user-1",
    recipientIds: ["user-2"],
    content: "Let's schedule a kick-off meeting for the website project.",
    timestamp: "2025-05-03T09:15:00Z",
    read: true,
    commentId: "comment-1",
    taskId: "task-1",
    projectId: "project-1"
  },
];

export const mockPurchases: Purchase[] = [
  {
    id: "purchase-1",
    clientId: "client-1",
    description: "Website redesign project",
    amount: 12000,
    date: "2025-04-15",
    category: "Development",
  },
];

// Mock Task Templates
export const mockTaskTemplates = [
  {
    id: "task-template-1",
    name: "Bug Report",
    description: "Template for reporting and tracking bugs",
    type: "task_template" as const,
    customFields: [
      {
        id: "severity",
        name: "Severity",
        type: "select" as const,
        options: ["Low", "Medium", "High", "Critical"],
        required: true,
        order: 1
      },
      {
        id: "reproduction-steps",
        name: "Steps to Reproduce",
        type: "textarea" as const,
        required: true,
        order: 2
      },
      {
        id: "browser",
        name: "Browser",
        type: "select" as const,
        options: ["Chrome", "Firefox", "Safari", "Edge", "Other"],
        required: false,
        order: 3
      }
    ],
    fieldOrder: ["severity", "reproduction-steps", "browser"],
    defaultAssignee: null,
    defaultStatus: "todo",
    defaultPriority: "high",
    estimatedHours: 2,
    usageCount: 15,
    tags: ["bug", "development"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "task-template-2", 
    name: "Feature Request",
    description: "Template for new feature development tasks",
    type: "task_template" as const,
    customFields: [
      {
        id: "feature-type",
        name: "Feature Type",
        type: "select" as const,
        options: ["UI Enhancement", "New Functionality", "Integration", "Performance"],
        required: true,
        order: 1
      },
      {
        id: "user-story",
        name: "User Story",
        type: "textarea" as const,
        required: true,
        order: 2
      },
      {
        id: "acceptance-criteria",
        name: "Acceptance Criteria",
        type: "textarea" as const,
        required: true,
        order: 3
      }
    ],
    fieldOrder: ["feature-type", "user-story", "acceptance-criteria"],
    defaultAssignee: null,
    defaultStatus: "backlog",
    defaultPriority: "medium",
    estimatedHours: 8,
    usageCount: 8,
    tags: ["feature", "development"],
    createdAt: "2024-01-20T14:30:00Z",
    updatedAt: "2024-01-20T14:30:00Z"
  },
  {
    id: "task-template-3",
    name: "Client Review",
    description: "Template for client review and feedback tasks",
    type: "task_template" as const,
    customFields: [
      {
        id: "review-type",
        name: "Review Type",
        type: "select" as const,
        options: ["Design Review", "Content Review", "Functionality Review", "Final Approval"],
        required: true,
        order: 1
      },
      {
        id: "deadline",
        name: "Client Deadline",
        type: "date" as const,
        required: true,
        order: 2
      },
      {
        id: "deliverables",
        name: "Deliverables",
        type: "textarea" as const,
        required: true,
        order: 3
      }
    ],
    fieldOrder: ["review-type", "deadline", "deliverables"],
    defaultAssignee: null,
    defaultStatus: "todo",
    defaultPriority: "high",
    estimatedHours: 1,
    usageCount: 12,
    tags: ["client", "review"],
    createdAt: "2024-01-25T09:15:00Z",
    updatedAt: "2024-01-25T09:15:00Z"
  }
];

export const mockProjectTemplates: ProjectTemplate[] = [];

export const mockComments: any[] = [];

// Mock custom fields
export const mockCustomFields: any[] = [];

// Mock dashboards  
export const mockDashboards: any[] = [];

// Helper functions for role management
export const BUILT_IN_ROLES = {
  ADMIN: ADMIN_ROLE_ID,
  USER: USER_ROLE_ID
};