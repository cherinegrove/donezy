// ============================================================
// RBAC User-Role Service
// Manages user ↔ role assignments
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { RbacUserRole, RbacRole, RbacPermission } from "@/types/rbac";

interface UserRoleRow {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role: RoleRow | null;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_system: boolean;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface RolePermRow {
  role_id: string;
  permission: RbacPermission | null;
}

// ----------------------------

export const userRoleService = {
  /**
   * Get all role assignments for a user (with role + permissions)
   */
  async getUserRoles(userId: string): Promise<RbacUserRole[]> {
    const { data, error } = await supabase
      .from("rbac_user_roles")
      .select(
        `
        id,
        user_id,
        role_id,
        assigned_by,
        assigned_at,
        role:rbac_roles(
          id, name, description, color, is_system, organization_id, created_at, updated_at
        )
      `,
      )
      .eq("user_id", userId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const rows = data as unknown as UserRoleRow[];

    // For each role, fetch its permissions
    const roleIds = rows
      .map((ur) => ur.role?.id)
      .filter((id): id is string => !!id);

    const permsByRole: Record<string, RbacPermission[]> = {};

    if (roleIds.length > 0) {
      const { data: rolePerms, error: rpError } = await supabase
        .from("rbac_role_permissions")
        .select(
          `
          role_id,
          permission:rbac_permissions(*)
        `,
        )
        .in("role_id", roleIds);

      if (!rpError && rolePerms) {
        for (const rp of rolePerms as unknown as RolePermRow[]) {
          if (!permsByRole[rp.role_id]) {
            permsByRole[rp.role_id] = [];
          }
          if (rp.permission) {
            permsByRole[rp.role_id].push(rp.permission);
          }
        }
      }
    }

    return rows.map((ur) => ({
      id: ur.id,
      user_id: ur.user_id,
      role_id: ur.role_id,
      assigned_by: ur.assigned_by,
      assigned_at: ur.assigned_at,
      role: ur.role
        ? {
            ...ur.role,
            permissions: permsByRole[ur.role.id] || [],
          }
        : undefined,
    }));
  },

  /**
   * Get all user-role assignments (for admin view)
   */
  async getAll(): Promise<RbacUserRole[]> {
    const { data, error } = await supabase
      .from("rbac_user_roles")
      .select(
        `
        id,
        user_id,
        role_id,
        assigned_by,
        assigned_at,
        role:rbac_roles(
          id, name, description, color, is_system
        )
      `,
      )
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as UserRoleRow[]).map((ur) => ({
      id: ur.id,
      user_id: ur.user_id,
      role_id: ur.role_id,
      assigned_by: ur.assigned_by,
      assigned_at: ur.assigned_at,
      role: ur.role ? { ...ur.role, permissions: [] } : undefined,
    }));
  },

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, roleId: string): Promise<RbacUserRole> {
    const currentUser = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from("rbac_user_roles")
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: currentUser?.id ?? "",
      })
      .select(
        `
        id,
        user_id,
        role_id,
        assigned_by,
        assigned_at,
        role:rbac_roles(
          id, name, description, color, is_system
        )
      `,
      )
      .single();

    if (error) throw error;
    const row = data as unknown as UserRoleRow;
    return {
      ...row,
      role: row.role ? { ...row.role, permissions: [] } : undefined,
    };
  },

  /**
   * Remove a role from a user
   */
  async removeRole(userRoleId: string): Promise<void> {
    const { error } = await supabase
      .from("rbac_user_roles")
      .delete()
      .eq("id", userRoleId);

    if (error) throw error;
  },

  /**
   * Remove a specific role from a user by userId + roleId
   */
  async removeRoleByIds(userId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .from("rbac_user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);

    if (error) throw error;
  },

  /**
   * Get resolved RBAC roles for a user (roles with full permissions).
   * This is the primary function used by AppContext to load user RBAC data.
   */
  async getResolvedRoles(userId: string): Promise<RbacRole[]> {
    const userRoles = await this.getUserRoles(userId);
    return userRoles
      .map((ur) => ur.role)
      .filter((r): r is RbacRole => r !== undefined);
  },

  /**
   * Bulk load resolved roles for multiple users (for admin views).
   * Returns a map of userId -> RbacRole[]
   */
  async getResolvedRolesForUsers(
    userIds: string[],
  ): Promise<Record<string, RbacRole[]>> {
    if (userIds.length === 0) return {};

    const { data: userRoles, error: urError } = await supabase
      .from("rbac_user_roles")
      .select(
        `
        user_id,
        role:rbac_roles(
          id, name, description, color, is_system, organization_id, created_at, updated_at
        )
      `,
      )
      .in("user_id", userIds);

    if (urError) throw urError;
    if (!userRoles || userRoles.length === 0) return {};

    const rows = userRoles as unknown as {
      user_id: string;
      role: RoleRow | null;
    }[];

    // Get unique role IDs
    const roleIds = [
      ...new Set(
        rows.map((ur) => ur.role?.id).filter((id): id is string => !!id),
      ),
    ];

    // Fetch permissions for all roles at once
    const permsByRole: Record<string, RbacPermission[]> = {};
    if (roleIds.length > 0) {
      const { data: rolePerms, error: rpError } = await supabase
        .from("rbac_role_permissions")
        .select(
          `
          role_id,
          permission:rbac_permissions(*)
        `,
        )
        .in("role_id", roleIds);

      if (!rpError && rolePerms) {
        for (const rp of rolePerms as unknown as RolePermRow[]) {
          if (!permsByRole[rp.role_id]) {
            permsByRole[rp.role_id] = [];
          }
          if (rp.permission) {
            permsByRole[rp.role_id].push(rp.permission);
          }
        }
      }
    }

    // Build the result map
    const result: Record<string, RbacRole[]> = {};
    for (const ur of rows) {
      if (!ur.role) continue;
      if (!result[ur.user_id]) {
        result[ur.user_id] = [];
      }
      result[ur.user_id].push({
        ...ur.role,
        permissions: permsByRole[ur.role.id] || [],
      });
    }

    return result;
  },
};
