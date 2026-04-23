// ============================================================
// RBAC Permission Service
// CRUD operations for rbac_permissions table
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { RbacPermission, RbacResource, RbacAction } from "@/types/rbac";

export const permissionService = {
  /**
   * Get all permissions
   */
  async getAll(): Promise<RbacPermission[]> {
    const { data, error } = await supabase
      .from("rbac_permissions")
      .select("*")
      .order("resource")
      .order("action");

    if (error) throw error;

    return (data as RbacPermission[]) || [];
  },

  /**
   * Get permissions grouped by resource
   */
  async getGroupedByResource(): Promise<Record<string, RbacPermission[]>> {
    const permissions = await this.getAll();
    const grouped: Record<string, RbacPermission[]> = {};

    for (const perm of permissions) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    }

    return grouped;
  },

  /**
   * Get permissions by resource name
   */
  async getByResource(resource: RbacResource): Promise<RbacPermission[]> {
    const { data, error } = await supabase
      .from("rbac_permissions")
      .select("*")
      .eq("resource", resource)
      .order("action");

    if (error) throw error;

    return (data as RbacPermission[]) || [];
  },

  /**
   * Get a single permission by ID
   */
  async getById(id: string): Promise<RbacPermission | null> {
    const { data, error } = await supabase
      .from("rbac_permissions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as RbacPermission;
  },

  /**
   * Create a new permission
   */
  async create(permission: {
    name: string;
    resource: RbacResource;
    action: RbacAction;
    description?: string;
  }): Promise<RbacPermission> {
    const { data, error } = await supabase
      .from("rbac_permissions")
      .insert(permission)
      .select()
      .single();

    if (error) throw error;
    return data as RbacPermission;
  },

  /**
   * Update a permission
   */
  async update(
    id: string,
    updates: Partial<{
      name: string;
      resource: RbacResource;
      action: RbacAction;
      description: string;
    }>,
  ): Promise<RbacPermission> {
    const { error } = await supabase
      .from("rbac_permissions")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    const updated = await this.getById(id);
    if (!updated) throw new Error("Permission not found after update");
    return updated;
  },

  /**
   * Delete a permission
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("rbac_permissions")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
