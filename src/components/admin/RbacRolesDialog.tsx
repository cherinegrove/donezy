import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Plus, Save, X, AlertTriangle } from "lucide-react";
import { roleService } from "@/services/rbac";
import type { RbacRole, RbacPermission, RbacScope } from "@/types/rbac";

interface RbacRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RbacRole | null;
  permissionsByResource: Record<string, RbacPermission[]>;
  onSuccess: () => void;
}

export function RbacRolesDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RbacRolesDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    color: string;
    selectedPermissions: Record<string, RbacScope>;
  }>({
    name: "",
    description: "",
    color: "#10b981",
    selectedPermissions: {},
  });

  useEffect(() => {
    if (open) {
      if (role) {
        setFormData({
          name: role.name,
          description: role.description || "",
          color: role.color || "#10b981",
          selectedPermissions: role.permissions.reduce(
            (acc, p) => {
              acc[p.id] = p.scope;
              return acc;
            },
            {} as Record<string, RbacScope>,
          ),
        });
      } else {
        setFormData({
          name: "",
          description: "",
          color: "#10b981",
          selectedPermissions: {},
        });
      }
    }
  }, [open, role]);

  const handleSaveRole = async () => {
    try {
      let savedRole: RbacRole;
      if (role) {
        savedRole = await roleService.update(role.id, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
        });
      } else {
        savedRole = await roleService.create({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          is_system: false,
        });
      }

      const selectedArray = Object.entries(formData.selectedPermissions).map(
        ([permissionId, scope]) => ({
          permissionId,
          scope,
        }),
      );
      await roleService.setPermissions(savedRole.id, selectedArray);

      onSuccess();
    } catch (err) {
      console.error("Failed to save role", err);
      alert("Failed to save role. Please check the console.");
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => {
      const next = { ...prev.selectedPermissions };
      if (next[permissionId]) {
        delete next[permissionId];
      } else {
        next[permissionId] = "own"; // default scope upon activation
      }
      return { ...prev, selectedPermissions: next };
    });
  };

  const updateScope = (permissionId: string, scope: RbacScope) => {
    setFormData((prev) => {
      const next = { ...prev.selectedPermissions };
      if (next[permissionId]) {
        next[permissionId] = scope;
      }
      return { ...prev, selectedPermissions: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {role ? "Edit Role: " + role.name : "Create New Role"}
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              {role && role.is_system && (
                <span className="flex items-center text-amber-500 mt-2 mb-4">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <strong>System Role:</strong> You can edit its permissions,
                  but not delete it or change its core purpose.
                </span>
              )}
              {!role?.is_system && (
                <span>
                  Define role details and select feature-specific permissions.
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="gap-8 grid grid-cols-1 xl:grid-cols-12 mt-4">
          <div className="space-y-6 xl:col-span-4 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  placeholder="e.g., Project Manager"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={role?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Input
                  id="roleDescription"
                  placeholder="Brief role description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-color">Role Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="role-color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                  className="w-12 h-10 border border-input rounded-md cursor-pointer shrink-0"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Permissions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select granular permissions to include in this role. Grouped
                  by resource.
                </p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-12 flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={!formData.name.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {role ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
