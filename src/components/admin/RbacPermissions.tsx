import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Key, Plus, Edit, Trash2 } from "lucide-react";
import { permissionService } from "@/services/rbac";
import type { RbacPermission, RbacResource } from "@/types/rbac";
import { RBAC_RESOURCES } from "@/types/rbac";
import { RbacPermissionDialog } from "./RbacPermissionDialog";
import { useToast } from "@/hooks/use-toast";

export default function RbacPermissions() {
  const { toast } = useToast();

  const [groupedPermissions, setGroupedPermissions] = useState<
    Record<string, RbacPermission[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<RbacPermission | null>(null);
  const [defaultResource, setDefaultResource] = useState<
    RbacResource | undefined
  >(undefined);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionService.getGroupedByResource();
      setGroupedPermissions(data);
    } catch (err) {
      console.error("Failed to load permissions", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handleCreateClick = (resource?: RbacResource) => {
    setEditingPermission(null);
    setDefaultResource(resource);
    setDialogOpen(true);
  };

  const handleEditClick = (permission: RbacPermission) => {
    setEditingPermission(permission);
    setDefaultResource(undefined);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (permission: RbacPermission) => {
    if (
      !confirm(
        `Delete permission "${permission.name}"?\n\nThis will remove it from all roles that use it.`,
      )
    )
      return;

    try {
      await permissionService.delete(permission.id);
      toast({
        title: "Permission deleted",
        description: `"${permission.name}" has been removed.`,
      });
      await loadPermissions();
    } catch (err) {
      console.error("Failed to delete permission", err);
      toast({
        title: "Delete failed",
        description: "This permission may still be assigned to roles.",
        variant: "destructive",
      });
    }
  };

  const handleDialogSuccess = async () => {
    setDialogOpen(false);
    await loadPermissions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Permissions</h2>
          <p className="text-muted-foreground mt-1">
            Granular permissions that define what actions can be performed on
            resources.
          </p>
        </div>
        <Button onClick={() => handleCreateClick()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Permission
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading permissions...
          </CardContent>
        </Card>
      ) : Object.keys(groupedPermissions).length > 0 ? (
        <div className="grid gap-6">
          {Object.entries(groupedPermissions).map(([resource, permissions]) => (
            <Card key={resource} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Resource:{" "}
                      <span className="font-mono text-sm px-2 py-1 bg-background border rounded-md">
                        {resource}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {permissions.length} permission(s) defined for this
                      resource
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateClick(resource as RbacResource)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add to {RBAC_RESOURCES.find((r) => r.value === resource)?.label ?? resource}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">
                        Permission Name
                      </TableHead>
                      <TableHead className="w-[20%]">Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[130px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {perm.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{perm.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {perm.description || (
                            <span className="italic opacity-50">
                              No description
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(perm)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(perm)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No Permissions Found
            </h3>
            <p>The system currently has no permissions defined.</p>
          </CardContent>
        </Card>
      )}

      <RbacPermissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permission={editingPermission}
        defaultResource={defaultResource}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
