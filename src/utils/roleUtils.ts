import { User, CustomRole, AccessLevel } from "@/types";

// System role types - the ONLY role system now
export type SystemRoleName = 'platform_admin' | 'support_admin';

// Check if user has any admin system role
export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.systemRoles?.includes('platform_admin') || 
         user.systemRoles?.includes('support_admin') || false;
};

// Check if user has platform_admin role specifically
export const isPlatformAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.systemRoles?.includes('platform_admin') || false;
};

// Check if user has support_admin role
export const isSupportAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.systemRoles?.includes('support_admin') || false;
};

// Check if user is a regular user (no admin roles)
export const isUser = (user: User | null): boolean => {
  if (!user) return false;
  return !isAdmin(user);
};

// Get display name for user's role
export const getRoleName = (user: User | null): string => {
  if (!user) return 'Unknown';
  
  if (user.systemRoles?.includes('platform_admin')) return 'Platform Admin';
  if (user.systemRoles?.includes('support_admin')) return 'Support Admin';
  
  return 'User';
};

// Check if user can manage other users
export const canManageUsers = (user: User | null): boolean => {
  return isPlatformAdmin(user);
};

// Check if user can edit time entries (own entries always allowed, admin can edit all)
export const canEditTimeEntries = (user: User | null, isOwnEntry: boolean = false): boolean => {
  if (isOwnEntry) return true;
  return isAdmin(user);
};

// Check if user can approve time entries
export const canApproveTimeEntries = (user: User | null): boolean => {
  return isAdmin(user);
};

// Check if user can access admin dashboard
export const canAccessAdmin = (user: User | null): boolean => {
  return isAdmin(user);
};

// Check if user can view all data across the platform
export const canViewAllData = (user: User | null): boolean => {
  return isAdmin(user);
};

// Legacy function - kept for backwards compatibility but now uses systemRoles
export const getUserRole = (user: User | null, _roles?: CustomRole[]): { name: string } | undefined => {
  if (!user) return undefined;
  return { name: getRoleName(user) };
};

// Legacy function - kept for backwards compatibility
export const hasPermission = (user: User | null, _roles: CustomRole[], feature: string, requiredLevel: AccessLevel): boolean => {
  // Admins have full access to everything
  if (isAdmin(user)) return true;
  
  // Regular users have limited access based on feature
  const userPermissions: Record<string, AccessLevel> = {
    'dashboard': 'view',
    'projects': 'edit',
    'tasks': 'edit',
    'timeTracking': 'edit',
    'clients': 'view',
    'teams': 'view',
    'users': 'none',
    'reports': 'view',
    'messages': 'edit',
    'notes': 'edit',
    'settings': 'view',
    'admin': 'none'
  };
  
  const userLevel = userPermissions[feature] || 'none';
  const levels = ['none', 'view', 'create', 'edit', 'delete'];
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
};
