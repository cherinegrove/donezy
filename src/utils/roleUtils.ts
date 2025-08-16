import { User, CustomRole, AccessLevel } from "@/types";

// Helper functions for the unified role system
export const getUserRole = (user: User, roles: CustomRole[]): CustomRole | undefined => {
  return roles.find(role => role.id === user.roleId);
};

export const isAdmin = (user: User, roles: CustomRole[]): boolean => {
  const role = getUserRole(user, roles);
  return role?.name === 'Admin';
};

export const isUser = (user: User, roles: CustomRole[]): boolean => {
  const role = getUserRole(user, roles);
  return role?.name === 'User';
};

export const hasPermission = (user: User, roles: CustomRole[], feature: string, requiredLevel: AccessLevel): boolean => {
  const userRole = getUserRole(user, roles);
  if (!userRole) return false;
  
  const userLevel = userRole.permissions[feature];
  if (!userLevel || userLevel === 'none') return false;
  
  const levels = ['none', 'view', 'create', 'edit', 'delete'];
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
};

export const getRoleName = (user: User, roles: CustomRole[]): string => {
  const role = getUserRole(user, roles);
  if (role?.name) return role.name;
  
  // Fallback for direct role strings
  if (user.roleId === 'admin') return 'Super Admin';
  if (user.roleId === 'user') return 'User';
  
  return 'Unknown Role';
};

export const canManageUsers = (user: User, roles: CustomRole[]): boolean => {
  return isAdmin(user, roles);
};

export const canEditTimeEntries = (user: User, roles: CustomRole[], isOwnEntry: boolean = false): boolean => {
  if (isOwnEntry) return true; // Users can always edit their own entries
  return isAdmin(user, roles);
};

export const canApproveTimeEntries = (user: User, roles: CustomRole[]): boolean => {
  return isAdmin(user, roles);
};