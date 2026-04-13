import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Plus, Save, X } from "lucide-react";
import { permissionService } from "@/services/rbac";
import type { RbacPermission, RbacResource, RbacAction } from "@/types/rbac";
import { RBAC_RESOURCES, RBAC_ACTIONS } from "@/types/rbac";
import { useToast } from "@/hooks/use-toast";

interface RbacPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode, a permission object = edit mode */
  permission: RbacPermission | null;
  /** Pre-select a resource when creating from within a resource group */
  defaultResource?: RbacResource;
  onSuccess: () => void;
}

export function RbacPermissionDialog({
  open,
  onOpenChange,
  permission,
  defaultResource,
  onSuccess,
}: RbacPermissionDialogProps) {
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    name: string;
    resource: RbacResource | "";
    action: RbacAction | "";
    description: string;
  }>({
    name: "",
    resource: defaultResource ?? "",
    action: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state whenever dialog opens or target permission changes
  useEffect(() => {
    if (open) {
      setError(null);
      if (permission) {
        setFormData({
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
          description: permission.description ?? "",
        });
      } else {
        setFormData({
          name: "",
          resource: defaultResource ?? "",
          action: "",
          description: "",
        });
      }
    }
  }, [open, permission, defaultResource]);

  // Auto-generate name when resource + action are both set (create mode only)
  useEffect(() => {
    if (!permission && formData.resource && formData.action) {
      setFormData((prev) => ({
        ...prev,
        name: `${prev.resource}:${prev.action}`,
      }));
    }
  }, [formData.resource, formData.action, permission]);

  const handleSave = async () => {
    if (!formData.resource || !formData.action || !formData.name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (permission) {
        await permissionService.update(permission.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        toast({
          title: "Permission updated",
          description: `"${formData.name.trim()}" has been updated successfully.`,
        });
      } else {
        await permissionService.create({
          name: formData.name.trim(),
          resource: formData.resource as RbacResource,
          action: formData.action as RbacAction,
          description: formData.description.trim() || undefined,
        });
        toast({
          title: "Permission created",
          description: `"${formData.name.trim()}" has been created successfully.`,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Unknown error";
      console.error("Failed to save permission:", msg, err);
      toast({
        title: permission ? "Update failed" : "Create failed",
        description: msg,
        variant: "destructive",
      });
      setError(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    formData.name.trim().length > 0 &&
    formData.resource !== "" &&
    formData.action !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {permission ? (
              <Edit className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {permission
              ? `Edit Permission: ${permission.name}`
              : "Create New Permission"}
          </DialogTitle>
          <DialogDescription>
            {permission
              ? "Update the permission's display name or description. Resource & action define the unique identifier and cannot be changed."
              : "Define a new granular permission by selecting a resource and action. The identifier is auto-generated."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Resource */}
          <div className="space-y-2">
            <Label htmlFor="perm-resource">Resource</Label>
            <Select
              value={formData.resource}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  resource: v as RbacResource,
                }))
              }
              disabled={!!permission}
            >
              <SelectTrigger id="perm-resource">
                <SelectValue placeholder="Select resource…" />
              </SelectTrigger>
              <SelectContent>
                {RBAC_RESOURCES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {r.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label htmlFor="perm-action">Action</Label>
            <Select
              value={formData.action}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, action: v as RbacAction }))
              }
              disabled={!!permission}
            >
              <SelectTrigger id="perm-action">
                <SelectValue placeholder="Select action…" />
              </SelectTrigger>
              <SelectContent>
                {RBAC_ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!!permission && (
              <p className="text-xs text-muted-foreground">
                Resource and action cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Permission identifier (name) */}
          <div className="space-y-2">
            <Label htmlFor="perm-name">
              Identifier{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (auto-generated, editable)
              </span>
            </Label>
            <Input
              id="perm-name"
              className="font-mono"
              placeholder="e.g. projects:create"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="perm-description">
              Description{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="perm-description"
              placeholder="Briefly describe what this permission allows…"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? "Saving…"
                : permission
                  ? "Update Permission"
                  : "Create Permission"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
