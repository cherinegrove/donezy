// ============================================================
// RBAC Resource Service
// CRUD operations for rbac_resources table
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { RbacResource_DB } from "@/types/rbac";

// Use the generated DB type for supabase operations
type ResourceInsert = {
  name: string;
  display_name: string;
  description?: string | null;
};

type ResourceUpdate = Partial<
  Pick<RbacResource_DB, "display_name" | "description">
>;

export const resourceService = {
  /**
   * Get all resources
   */
  async getAll(): Promise<RbacResource_DB[]> {
    const { data, error } = await supabase
      .from("rbac_resources")
      .select("*")
      .order("display_name");

    if (error) throw error;
    return (data as RbacResource_DB[]) || [];
  },

  /**
   * Get resource by name
   */
  async getByName(name: string): Promise<RbacResource_DB | null> {
    const { data, error } = await supabase
      .from("rbac_resources")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data as RbacResource_DB;
  },

  /**
   * Create a new resource
   */
  async create(
    resource: Omit<RbacResource_DB, "id" | "created_at" | "updated_at">,
  ): Promise<RbacResource_DB> {
    const { data, error } = await supabase
      .from("rbac_resources")
      .insert(resource as ResourceInsert)
      .select()
      .single();

    if (error) throw error;
    return data as RbacResource_DB;
  },

  /**
   * Update resource
   */
  async update(id: string, updates: ResourceUpdate): Promise<RbacResource_DB> {
    const { error } = await supabase
      .from("rbac_resources")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    // Re-fetch the row separately so the SELECT policy (USING true) is used,
    // avoiding PGRST116 when the UPDATE's RETURNING is filtered by WITH CHECK.
    const { data, error: fetchError } = await supabase
      .from("rbac_resources")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    return data as RbacResource_DB;
  },

  /**
   * Delete resource
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("rbac_resources")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
