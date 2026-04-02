import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RbacRolesDialog } from "./RbacRolesDialog";
import { Shield, Plus, Edit, Trash2, Info, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { roleService, permissionService } from "@/services/rbac";
import type { RbacRole, RbacPermission, RbacScope } from "@/types/rbac";
import { RBAC_RESOURCES, RBAC_SCOPES } from "@/types/rbac";

export default function RbacRoles() {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissionsByResource, setPermissionsByResource] = useState<
    Record<string, RbacPermission[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedPerms] = await Promise.all([
        roleService.getAll(),
        permissionService.getGroupedByResource(),
      ]);
      setRoles(fetchedRoles);
      setPermissionsByResource(fetchedPerms);
    } catch (err) {
      console.error("Failed to load RBAC data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRole = () => {
    setIsCreating(true);
    setEditingRole(null);
  };

  const handleEditRole = (role: RbacRole) => {
    setEditingRole(role);
    setIsCreating(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this role? Users assigned to this role will lose its permissions.",
      )
    )
      return;

    try {
      await roleService.delete(roleId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete role", err);
      alert("Failed to delete role. It might be a system role.");
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsCreating(false);
      setEditingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading RBAC roles...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage custom roles with feature-specific permissions
            based on the new RBAC engine.
          </p>
        </div>
        {!isCreating && !editingRole && (
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Role Permissions:</strong> Roles aggregate permissions that
          allow specific actions on resources, applying at various scopes (own,
          project, all).
        </AlertDescription>
      </Alert>

      {/* Create/Edit Role Dialog */}
      <RbacRolesDialog
        open={isCreating || !!editingRole}
        onOpenChange={handleDialogClose}
        role={editingRole}
        permissionsByResource={permissionsByResource}
        onSuccess={async () => {
          await loadData();
          handleDialogClose(false);
        }}
      />

      {/* Role List Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length > 0 ? (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.color || "#10b981" }}
                      />
                      <div className="flex items-center gap-2">
                        {role.is_system ? (
                          <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <User className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <span className="font-medium text-base">
                          {role.name}
                        </span>
                        {role.is_system && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-normal px-1.5 py-0"
                          >
                            System
                          </Badge>
                        )}
                      </div>
                    </div>

                    {role.description}
                  </TableCell>
                  <TableCell width="55%">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {role.permissions.length} total permissions
                      </span>
                      {role.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            role.permissions.reduce(
                              (acc, p) => {
                                if (!acc[p.resource]) acc[p.resource] = 0;
                                acc[p.resource]++;
                                return acc;
                              },
                              {} as Record<string, number>,
                            ),
                          )
                            .map(([res, count]) => ({
                              res,
                              count,
                              displayName:
                                RBAC_RESOURCES.find((r) => r.value === res)
                                  ?.label || res,
                            }))
                            .sort((a, b) =>
                              a.displayName.localeCompare(b.displayName),
                            )
                            .map(({ res, count, displayName }) => (
                              <Badge key={res} variant="outline">
                                {displayName} ({count})
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No roles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
