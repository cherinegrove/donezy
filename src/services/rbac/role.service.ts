// ============================================================
// RBAC Role Service
// CRUD operations for rbac_roles + rbac_role_permissions
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type {
  RbacRole,
  RbacPermission,
  RbacAssignedPermission,
  RbacScope,
} from "@/types/rbac";

// ---- Typed DB row shapes (mirrors generated types) ----

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_system: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RolePermRow {
  id?: string;
  role_id: string;
  permission_id?: string;
  scope: RbacScope;
  permission: RbacPermission | null;
}

interface PermIdRow {
  permission_id: string;
}

// -------------------------------------------------------

/**
 * Convert raw DB rows into a RbacRole with nested permissions
 */
function assembleRole(
  roleRow: RoleRow,
  permissions: RbacAssignedPermission[],
): RbacRole {
  return {
    id: roleRow.id,
    name: roleRow.name,
    description: roleRow.description,
    color: roleRow.color,
    is_system: roleRow.is_system,
    organization_id: roleRow.organization_id,
    permissions,
    created_at: roleRow.created_at,
    updated_at: roleRow.updated_at,
  };
}

export const roleService = {
  /**
   * Get all roles with their permissions
   */
  async getAll(): Promise<RbacRole[]> {
    const { data: roles, error: rolesError } = await supabase
      .from("rbac_roles")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name");

    if (rolesError) throw rolesError;
    if (!roles || roles.length === 0) return [];

    // Fetch all role_permissions with permission details
    const { data: rolePerms, error: rpError } = await supabase.from(
      "rbac_role_permissions",
    ).select(`
        id,
        role_id,
        permission_id,
        scope,
        permission:rbac_permissions(*)
      `);

    if (rpError) throw rpError;

    // Group permissions by role_id
    const permsByRole: Record<string, RbacAssignedPermission[]> = {};
    if (rolePerms) {
      for (const rp of rolePerms as unknown as RolePermRow[]) {
        if (!permsByRole[rp.role_id]) {
          permsByRole[rp.role_id] = [];
        }
        if (rp.permission) {
          permsByRole[rp.role_id].push({
            ...rp.permission,
            scope: rp.scope,
          });
        }
      }
    }

    return (roles as RoleRow[]).map((role) =>
      assembleRole(role, permsByRole[role.id] || []),
    );
  },

  /**
   * Get a single role by ID with permissions
   */
  async getById(id: string): Promise<RbacRole | null> {
    const { data: role, error } = await supabase
      .from("rbac_roles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    // Fetch permissions for this role
    const { data: rolePerms, error: rpError } = await supabase
      .from("rbac_role_permissions")
      .select(
        `
        scope,
        permission:rbac_permissions(*)
      `,
      )
      .eq("role_id", id);

    if (rpError) throw rpError;

    const permissions: RbacAssignedPermission[] = (
      rolePerms as unknown as RolePermRow[]
    )
      .map((rp) =>
        rp.permission ? { ...rp.permission, scope: rp.scope } : null,
      )
      .filter((p): p is RbacAssignedPermission => p !== null);

    return assembleRole(role as RoleRow, permissions);
  },

  /**
   * Create a new role (without permissions)
   */
  async create(role: {
    name: string;
    description?: string;
    color?: string;
    is_system?: boolean;
    organization_id?: string;
  }): Promise<RbacRole> {
    const { data, error } = await supabase
      .from("rbac_roles")
      .insert(role)
      .select()
      .single();

    if (error) throw error;
    return assembleRole(data as RoleRow, []);
  },

  /**
   * Update role metadata
   */
  async update(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      color: string;
    }>,
  ): Promise<RbacRole> {
    // Plain PATCH without .select() to avoid sending "Prefer: return=representation"
    // which triggers a restrictive CORS preflight on some Supabase configurations.
    const { error } = await supabase
      .from("rbac_roles")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    // Re-fetch the full role with permissions via GET (always allowed by CORS).
    return (await this.getById(id))!;
  },

  /**
   * Delete a role (only non-system roles)
   */
  async delete(id: string): Promise<void> {
    const role = await this.getById(id);
    if (role?.is_system) {
      throw new Error("Cannot delete system roles");
    }

    const { error } = await supabase.from("rbac_roles").delete().eq("id", id);

    if (error) throw error;
  },

  /**
   * Assign a permission to a role
   */
  async assignPermission(
    roleId: string,
    permissionId: string,
    scope: RbacScope = "own",
  ): Promise<void> {
    const { error } = await supabase
      .from("rbac_role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId, scope });

    if (error) throw error;
  },

  /**
   * Remove a permission from a role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from("rbac_role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);

    if (error) throw error;
  },

  /**
   * Set all permissions for a role (replaces existing)
   */
  async setPermissions(
    roleId: string,
    permissions: { permissionId: string; scope: RbacScope }[],
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("rbac_role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) throw deleteError;

    if (permissions.length > 0) {
      const rows = permissions.map((p) => ({
        role_id: roleId,
        permission_id: p.permissionId,
        scope: p.scope,
      }));

      const { error: insertError } = await supabase
        .from("rbac_role_permissions")
        .insert(rows);

      if (insertError) throw insertError;
    }
  },

  /**
   * Get assigned permissions with scopes
   */
  async getAssignedPermissions(
    roleId: string,
  ): Promise<{ permissionId: string; scope: RbacScope }[]> {
    const { data, error } = await supabase
      .from("rbac_role_permissions")
      .select("permission_id, scope")
      .eq("role_id", roleId);

    if (error) throw error;
    return (data as any[]).map((rp) => ({
      permissionId: rp.permission_id,
      scope: rp.scope,
    }));
  },
};
