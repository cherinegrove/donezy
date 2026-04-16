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

  const can = (
    resource: RbacResource | "*",
    action: RbacAction | "*",
    requiredScope?: RbacScope,
  ): boolean => hasPermission(currentUser, resource, action, requiredScope);

  const canAccessFn = (
    resource: RbacResource,
    action: RbacAction,
    context?: PermissionContext,
  ): boolean => canAccess(currentUser, resource, action, context);

  const getScope = (
    resource: RbacResource,
    action: RbacAction,
  ): RbacScope | null => getEffectiveScope(currentUser, resource, action);
  const canViewAll = (resource: RbacResource): boolean =>
    hasPermission(currentUser, resource, "view", "all");
  const canManage = (resource: RbacResource): boolean =>
    hasPermission(currentUser, resource, "manage", "all");
  const getDataScope = (
    resource: RbacResource,
    action: RbacAction,
  ): RbacScope | null => getEffectiveScope(currentUser, resource, action);
  const filterByScope = <T>(
    items: T[],
    resource: RbacResource,
    action: RbacAction,
    getOwnerId: (item: T) => string | undefined,
    getProjectId?: (item: T) => string | undefined,
  ): T[] => {
    const scope = getEffectiveScope(currentUser, resource, action);

    if (!scope) return []; // no permission at all

    if (scope === "all") return items;

    const userId = currentUser?.id;
    const authUserId = currentUser?.auth_user_id;

    if (scope === "project") {
      return items.filter((item) => {
        const projectId = getProjectId?.(item);
        if (projectId) return true;
        const ownerId = getOwnerId(item);
        return ownerId === userId || ownerId === authUserId;
      });
    }

    return items.filter((item) => {
      const ownerId = getOwnerId(item);
      return ownerId === userId || ownerId === authUserId;
    });
  };

  return {
    can,
    canAccess: canAccessFn,
    hasRole: (roleName: string): boolean =>
      currentUser?.rbacRoles?.some((r) => r.name === roleName) || false,
    isAdmin: (): boolean => isRbacAdmin(currentUser),
    getScope,
    canViewAll,
    canManage,
    getDataScope,
    filterByScope,
    permissions: getAllPermissions(currentUser),
    roleNames: getRoleNames(currentUser),
    roles: (currentUser?.rbacRoles || []) as RbacRole[],
  };
}
