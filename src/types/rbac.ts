// ============================================================
// RBAC (Role-Based Access Control) Type Definitions
// ============================================================

// --- Actions ---
// What a user can do with a resource
export type RbacAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "archive"
  | "restore"
  | "export"
  | "import"
  | "manage"
  | "share"
  | "send"
  | "use"
  | "perform";

export const RBAC_ACTIONS: { value: RbacAction; label: string }[] = [
  { value: "view", label: "View" },
  { value: "create", label: "Create" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "manage", label: "Manage" },
  { value: "share", label: "Share" },
  { value: "send", label: "Send" },
  { value: "use", label: "Use" },
  { value: "perform", label: "Perform" },
];

// --- Resources ---
// What a permission applies to
export type RbacResource =
  | "projects"
  | "tasks"
  | "time_entries"
  | "users"
  | "teams"
  | "clients"
  | "roles"
  | "permissions"
  | "templates"
  | "statuses"
  | "custom_fields"
  | "notes"
  | "messages"
  | "comments"
  | "analytics"
  | "dashboards"
  | "billing"
  | "settings"
  | "integrations"
  | "audit_logs"
  | "notifications"
  | "platform_settings";

export const RBAC_RESOURCES: {
  value: RbacResource;
  label: string;
  description: string;
}[] = [
  { value: "projects", label: "Projects", description: "Project management" },
  { value: "tasks", label: "Tasks", description: "Task management" },
  {
    value: "time_entries",
    label: "Time Entries",
    description: "Time tracking",
  },
  { value: "users", label: "Users", description: "User management" },
  { value: "teams", label: "Teams", description: "Team management" },
  { value: "clients", label: "Clients", description: "Client management" },
  { value: "roles", label: "Roles", description: "Role management" },
  {
    value: "permissions",
    label: "Permissions",
    description: "Permission management",
  },
  {
    value: "templates",
    label: "Templates",
    description: "Project/task templates",
  },
  {
    value: "statuses",
    label: "Statuses",
    description: "Task/project status definitions",
  },
  {
    value: "custom_fields",
    label: "Custom Fields",
    description: "Custom field definitions",
  },
  { value: "notes", label: "Notes", description: "Personal notes" },
  { value: "messages", label: "Messages", description: "Internal messaging" },
  { value: "comments", label: "Comments", description: "Task comments" },
  {
    value: "analytics",
    label: "Analytics",
    description: "Dashboards and reports",
  },
  {
    value: "dashboards",
    label: "Dashboards",
    description: "Custom dashboards",
  },
  { value: "billing", label: "Billing", description: "Billing and purchases" },
  { value: "settings", label: "Settings", description: "User settings" },
  {
    value: "integrations",
    label: "Integrations",
    description: "Third-party integrations",
  },
  { value: "audit_logs", label: "Audit Logs", description: "Activity logs" },
  {
    value: "notifications",
    label: "Notifications",
    description: "User notifications",
  },
  {
    value: "platform_settings",
    label: "Platform Settings",
    description: "Platform-wide admin settings",
  },
];

// --- Scopes ---
// Hierarchical: all > project > own
export type RbacScope = "own" | "project" | "all";

export const RBAC_SCOPES: {
  value: RbacScope;
  label: string;
  description: string;
}[] = [
  { value: "own", label: "Own", description: "Own data only" },
  { value: "project", label: "Project", description: "Project data" },
  { value: "all", label: "All", description: "All data in platform" },
];

// Scope hierarchy level (higher = broader access)
export const SCOPE_HIERARCHY: Record<RbacScope, number> = {
  own: 0,
  project: 1,
  all: 2,
};

// --- Core Interfaces ---

export interface RbacPermission {
  id: string;
  name: string; // e.g. 'projects:view'
  resource: RbacResource;
  action: RbacAction;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RbacRole {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_system: boolean; // Built-in roles cannot be deleted
  organization_id?: string;
  permissions: RbacAssignedPermission[];
  created_at?: string;
  updated_at?: string;
}

export interface RbacUserRole {
  id: string;
  user_id: string;
  role_id: string;
  role?: RbacRole;
  assigned_by?: string;
  assigned_at: string;
}

export interface RbacResource_DB {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RbacRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  scope: RbacScope;
  created_at?: string;
}

export interface RbacAssignedPermission extends RbacPermission {
  scope: RbacScope;
}

// --- Permission Check Context ---
// Used when evaluating scope-based access
export interface PermissionContext {
  ownerId?: string; // Owner of the resource being accessed
  projectId?: string; // Project the resource belongs to
  teamIds?: string[]; // Teams the resource belongs to
}

// --- Resource → Actions mapping ---
// Defines which actions are valid for each resource
export const RESOURCE_ACTIONS: Record<RbacResource, RbacAction[]> = {
  projects: [
    "view",
    "create",
    "edit",
    "delete",
    "archive",
    "restore",
    "share",
    "import",
    "export",
  ],
  tasks: ["view", "create", "edit", "delete"],
  time_entries: ["view", "perform", "manage", "export"],
  users: ["view", "create", "edit", "delete", "manage", "import", "export"],
  teams: ["view", "create", "edit", "delete", "manage"],
  clients: ["view", "create", "edit", "delete", "export"],
  roles: ["view", "create", "edit", "delete"],
  permissions: ["view", "create", "edit", "delete"],
  templates: ["view", "create", "edit", "delete", "use"],
  statuses: ["view", "create", "edit", "delete"],
  custom_fields: ["view", "create", "edit", "delete"],
  notes: ["view", "create", "edit", "delete"],
  messages: ["view", "create", "edit", "delete", "send"],
  comments: ["view", "create", "edit"],
  analytics: ["view"],
  dashboards: ["view", "create", "edit", "delete"],
  billing: ["view", "create", "edit", "delete", "export"],
  settings: ["view", "edit"],
  integrations: ["view", "create", "edit"],
  audit_logs: ["view", "export"],
  notifications: ["view"],
  platform_settings: ["view", "edit"],
};
