// ============================================================
// RBAC Authorization Engine
// Core functions for permission checking
// ============================================================

import type {
  RbacPermission,
  RbacRole,
  RbacScope,
  RbacResource,
  RbacAction,
  PermissionContext,
  SCOPE_HIERARCHY as ScopeHierarchyType,
} from "@/types/rbac";
import type { User } from "@/types";
import { SCOPE_HIERARCHY } from "@/types/rbac";


// Re-export types for convenience
export type {
  RbacPermission,
  RbacRole,
  RbacScope,
  RbacResource,
  RbacAction,
  PermissionContext,
};


// ============================================================
// Core Permission Check
// ============================================================

/**
 * Check if a user has a specific permission.
 *
 * @param user - The user to check
 * @param resource - The resource being accessed (e.g., 'projects')
 * @param action - The action being performed (e.g., 'create')
 * @param requiredScope - The minimum scope needed (default: 'own')
 * @returns true if user has the permission
 */
export function hasPermission(
  user: User | null | undefined,
  resource: RbacResource | "*",
  action: RbacAction | "*",
  requiredScope: RbacScope = "own"
): boolean {
  if (!user) return false;

  const roles = user.rbacRoles;
  if (!roles || roles.length === 0) return false;

  // Check across all user roles
  for (const role of roles) {
    if (!role.permissions) continue;

    for (const perm of role.permissions) {
      // Wildcard match
      const resourceMatch = resource === "*" || perm.resource === resource;
      const actionMatch = action === "*" || perm.action === action;

      if (resourceMatch && actionMatch) {
        // Check scope hierarchy: perm.scope must be >= requiredScope
        if (scopeIncludes(perm.scope, requiredScope)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a user can access a resource with specific context.
 * This handles scope-based filtering (own, project, all).
 *
 * **Scope contract (Option B):**
 * - `all`     → Always allowed.
 * - `project` → Allowed when `context.projectId` is provided. The **caller**
 *               is responsible for only supplying a `projectId` when the user
 *               is already known to be a member of that project (e.g. data was
 *               fetched via RLS / pre-filtered by membership). The engine does
 *               NOT re-verify membership — it only enforces the scope level.
 * - `own`     → Allowed when `context.ownerId` matches the user's id or
 *               auth_user_id. If no `ownerId` is supplied, access is granted
 *               (assume the resource is the user's own).
 *
 * @param user    - The user to check
 * @param resource - The resource being accessed
 * @param action  - The action being performed
 * @param context - Contextual info: `ownerId`, `projectId` (caller-verified)
 * @returns true if access is allowed
 */
export function canAccess(
  user: User | null | undefined,
  resource: RbacResource,
  action: RbacAction,
  context: PermissionContext = {}
): boolean {
  if (!user) return false;

  const roles = user.rbacRoles;
  if (!roles || roles.length === 0) return false;

  for (const role of roles) {
    if (!role.permissions) continue;

    for (const perm of role.permissions) {
      if (perm.resource !== resource || perm.action !== action) continue;

      // Check scope against context
      switch (perm.scope) {
        case "all":
          return true;

        case "project":
          // Option B: The caller guarantees that `context.projectId` is only
          // set when the user is already a member of that project.
          // This engine trusts that guarantee and grants access.
          if (context.projectId) return true;
          // No project context supplied — fall back to own-level check.
          if (
            context.ownerId === user.auth_user_id ||
            context.ownerId === user.id
          )
            return true;
          break;

        case "own":
          if (
            context.ownerId === user.auth_user_id ||
            context.ownerId === user.id
          )
            return true;
          // If no owner context provided, assume own access is allowed
          if (!context.ownerId) return true;
          break;
      }
    }
  }

  return false;
}

// ============================================================
// Scope Utilities
// ============================================================

/**
 * Check if a given scope includes/covers the required scope.
 * Hierarchy: all > project > own
 */
export function scopeIncludes(
  userScope: RbacScope,
  requiredScope: RbacScope
): boolean {
  return SCOPE_HIERARCHY[userScope] >= SCOPE_HIERARCHY[requiredScope];
}

/**
 * Get the highest scope a user has for a specific resource:action.
 */
export function getEffectiveScope(
  user: User | null | undefined,
  resource: RbacResource,
  action: RbacAction
): RbacScope | null {
  if (!user) return null;

  const roles = user.rbacRoles;
  if (!roles || roles.length === 0) return null;

  let highestScope: RbacScope | null = null;

  for (const role of roles) {
    if (!role.permissions) continue;

    for (const perm of role.permissions) {
      if (perm.resource === resource && perm.action === action) {
        if (
          !highestScope ||
          SCOPE_HIERARCHY[perm.scope] > SCOPE_HIERARCHY[highestScope]
        ) {
          highestScope = perm.scope;
        }
      }
    }
  }

  return highestScope;
}

// ============================================================
// Convenience Checks
// ============================================================

/** Check if user has any admin-level role */
export function isRbacAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // RBAC check: user has platform_settings:edit (only admins have this)
  return hasPermission(user, "platform_settings", "edit", "all");
}

/** Get all unique permissions across all user roles */
export function getAllPermissions(
  user: User | null | undefined
): RbacPermission[] {
  if (!user?.rbacRoles) return [];

  const seen = new Set<string>();
  const permissions: RbacPermission[] = [];

  for (const role of user.rbacRoles) {
    if (!role.permissions) continue;
    for (const perm of role.permissions) {
      if (!seen.has(perm.id)) {
        seen.add(perm.id);
        permissions.push(perm);
      }
    }
  }

  return permissions;
}

/** Get all role names for a user */
export function getRoleNames(user: User | null | undefined): string[] {
  if (!user?.rbacRoles) {
    return [];
  }

  return user.rbacRoles.map((r) => r.name);
}
