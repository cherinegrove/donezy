import { useAppContext } from "@/contexts/AppContext";
import {
  hasPermission,
  canAccess,
  isRbacAdmin,
  getEffectiveScope,
  getAllPermissions,
  getRoleNames,
} from "@/lib/rbac";
import type {
  RbacResource,
  RbacAction,
  RbacScope,
  PermissionContext,
  RbacRole,
} from "@/types/rbac";

export function useRbac() {
  const { currentUser } = useAppContext();

  return {
    can: (
      resource: RbacResource | "*",
      action: RbacAction | "*",
      requiredScope?: RbacScope,
    ): boolean => {
      return hasPermission(currentUser, resource, action, requiredScope);
    },

    canAccess: (
      resource: RbacResource,
      action: RbacAction,
      context?: PermissionContext,
    ): boolean => {
      return canAccess(currentUser, resource, action, context);
    },

    hasRole: (roleName: string): boolean => {
      return currentUser?.rbacRoles?.some((r) => r.name === roleName) || false;
    },

    isAdmin: (): boolean => {
      return isRbacAdmin(currentUser);
    },

    getScope: (
      resource: RbacResource,
      action: RbacAction,
    ): RbacScope | null => {
      return getEffectiveScope(currentUser, resource, action);
    },

    permissions: getAllPermissions(currentUser),

    roleNames: getRoleNames(currentUser),

    roles: (currentUser?.rbacRoles || []) as RbacRole[],
  };
}
