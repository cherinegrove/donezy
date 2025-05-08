
import { User, Team, Client, Project, Task, TimeEntry, Message, Purchase, CustomField } from "@/types";

export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    email: "alex@manex.com",
    avatar: "/placeholder.svg",
    role: "admin",
    teamIds: ["team-1"],
  },
  {
    id: "user-2",
    name: "Sam Davis",
    email: "sam@manex.com",
    avatar: "/placeholder.svg",
    role: "manager",
    teamIds: ["team-1"],
  },
  {
    id: "user-3",
    name: "Taylor Wilson",
    email: "taylor@manex.com",
    avatar: "/placeholder.svg",
    role: "developer",
    teamIds: ["team-1"],
  },
];

export const mockTeams: Team[] = [
  {
    id: "team-1",
    name: "Core Team",
    description: "Main development team",
    members: ["user-1", "user-2", "user-3"],
    projectIds: ["project-1", "project-2"],
  },
];

export const mockClients: Client[] = [
  {
    id: "client-1",
    name: "Acme Corporation",
    contactName: "John Doe",
    email: "john@acme.com",
    phone: "123-456-7890",
    address: "123 Business Ave, Suite 100",
    projectIds: ["project-1"],
    billableRate: 125,
    currency: "USD",
  },
  {
    id: "client-2",
    name: "TechStart Inc",
    contactName: "Jane Smith",
    email: "jane@techstart.com",
    phone: "987-654-3210",
    projectIds: ["project-2"],
    billableRate: 150,
    currency: "EUR",
  },
];

export const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "Website Redesign",
    description: "Complete overhaul of Acme's corporate website",
    clientId: "client-1",
    teamIds: ["team-1"],
    taskIds: ["task-1", "task-2", "task-3"],
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
    taskIds: ["task-4", "task-5"],
    startDate: "2025-05-15",
    dueDate: "2025-08-15",
    status: "todo",
    serviceType: "bank-hours",
    allocatedHours: 200,
    usedHours: 0,
  },
];

export const mockCustomFields: CustomField[] = [
  {
    id: "field-1",
    name: "Platform",
    type: "select",
    options: ["Web", "iOS", "Android", "Desktop"],
    required: true,
  },
  {
    id: "field-2",
    name: "Story Points",
    type: "number",
    required: false,
  },
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Design Homepage Layout",
    description: "Create wireframes and design for the new homepage",
    projectId: "project-1",
    assigneeIds: ["user-2"],
    status: "in-progress",
    priority: "high",
    dueDate: "2025-05-20",
    createdAt: "2025-05-05",
    customFields: {
      "field-1": "Web",
      "field-2": 8,
    },
    subtasks: ["task-2", "task-3"],
    timeEntries: [
      {
        id: "time-1",
        taskId: "task-1",
        projectId: "project-1",
        clientId: "client-1", // Added clientId
        userId: "user-2",
        startTime: "2025-05-10T09:00:00Z",
        endTime: "2025-05-10T12:30:00Z",
        duration: 210,
        notes: "Initial wireframing",
        billable: true,
      },
    ],
    comments: [
      {
        id: "comment-1",
        taskId: "task-1",
        userId: "user-1",
        content: "Let's make sure we follow the brand guidelines",
        timestamp: "2025-05-06T10:15:00Z",
      },
    ],
  },
  {
    id: "task-2",
    title: "Implement Homepage HTML/CSS",
    description: "Convert the design into HTML and CSS",
    projectId: "project-1",
    parentTaskId: "task-1",
    assigneeIds: ["user-3"],
    status: "todo",
    priority: "medium",
    dueDate: "2025-05-25",
    createdAt: "2025-05-05",
    customFields: {
      "field-1": "Web",
      "field-2": 5,
    },
    subtasks: [],
    timeEntries: [],
    comments: [],
  },
  {
    id: "task-3",
    title: "Optimize Images",
    description: "Optimize all homepage images for web",
    projectId: "project-1",
    parentTaskId: "task-1",
    assigneeIds: ["user-3"],
    status: "todo",
    priority: "low",
    dueDate: "2025-05-22",
    createdAt: "2025-05-05",
    customFields: {
      "field-1": "Web",
      "field-2": 2,
    },
    subtasks: [],
    timeEntries: [],
    comments: [],
  },
  {
    id: "task-4",
    title: "App Architecture Planning",
    description: "Define the app architecture and technology stack",
    projectId: "project-2",
    assigneeIds: ["user-1", "user-2"],
    status: "todo",
    priority: "high",
    dueDate: "2025-05-30",
    createdAt: "2025-05-16",
    customFields: {
      "field-1": "iOS",
      "field-2": 13,
    },
    subtasks: ["task-5"],
    timeEntries: [],
    comments: [],
  },
  {
    id: "task-5",
    title: "Create UI Component Library",
    description: "Design and implement reusable UI components",
    projectId: "project-2",
    parentTaskId: "task-4",
    assigneeIds: ["user-2"],
    status: "todo",
    priority: "medium",
    dueDate: "2025-06-15",
    createdAt: "2025-05-16",
    customFields: {
      "field-1": "iOS",
      "field-2": 8,
    },
    subtasks: [],
    timeEntries: [],
    comments: [],
  },
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: "time-1",
    taskId: "task-1",
    projectId: "project-1",
    clientId: "client-1", // Added clientId
    userId: "user-2",
    startTime: "2025-05-10T09:00:00Z",
    endTime: "2025-05-10T12:30:00Z",
    duration: 210,
    notes: "Initial wireframing",
    billable: true,
  },
  {
    id: "time-2",
    taskId: "task-1",
    projectId: "project-1",
    clientId: "client-1", // Added clientId
    userId: "user-2",
    startTime: "2025-05-11T10:00:00Z",
    endTime: "2025-05-11T14:00:00Z",
    duration: 240,
    notes: "Finalizing design",
    billable: true,
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
  {
    id: "msg-2",
    senderId: "user-2",
    recipientIds: ["user-1", "user-3"],
    content: "Can we review the design together tomorrow?",
    timestamp: "2025-05-07T14:30:00Z",
    read: false,
    commentId: "comment-2",
    taskId: "task-1",
    projectId: "project-1"
  },
];

export const mockPurchases: Purchase[] = [
  {
    id: "purchase-1",
    clientId: "client-1",
    serviceType: "project",
    hours: 120,
    amount: 12000,
    date: "2025-04-15",
    projectId: "project-1",
    description: "Website redesign project",
  },
  {
    id: "purchase-2",
    clientId: "client-2",
    serviceType: "bank-hours",
    hours: 200,
    amount: 18000,
    date: "2025-05-01",
    projectId: "project-2",
    description: "Mobile app development hours bank",
  },
];
