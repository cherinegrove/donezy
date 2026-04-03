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
import { Edit, Plus, Save, X } from "lucide-react";
import { resourceService } from "@/services/rbac";
import type { RbacResource_DB } from "@/types/rbac";

interface RbacResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null means "create mode", a resource object means "edit mode" */
  resource: RbacResource_DB | null;
  onSuccess: () => void;
}

export function RbacResourcesDialog({
  open,
  onOpenChange,
  resource,
  onSuccess,
}: RbacResourcesDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form whenever the dialog opens or the target resource changes
  useEffect(() => {
    if (open) {
      setError(null);
      if (resource) {
        setFormData({
          name: resource.name,
          display_name: resource.display_name,
          description: resource.description ?? "",
        });
      } else {
        setFormData({ name: "", display_name: "", description: "" });
      }
    }
  }, [open, resource]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.display_name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (resource) {
        await resourceService.update(resource.id, {
          display_name: formData.display_name.trim(),
          description: formData.description.trim() || undefined,
        });
      } else {
        await resourceService.create({
          name: formData.name.trim().toLowerCase().replace(/\s+/g, "_"),
          display_name: formData.display_name.trim(),
          description: formData.description.trim() || undefined,
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
      console.error("Failed to save resource:", msg, err);
      setError(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    formData.name.trim().length > 0 && formData.display_name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resource ? (
              <Edit className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {resource
              ? `Edit Resource: ${resource.display_name}`
              : "Create New Resource"}
          </DialogTitle>
          <DialogDescription>
            {resource
              ? "Update the display name or description. The resource identifier cannot be changed."
              : "Define a new protected resource. The identifier is used internally and cannot be changed later."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Resource identifier — read-only when editing */}
          <div className="space-y-2">
            <Label htmlFor="resource-name">
              Resource Identifier{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (snake_case, immutable)
              </span>
            </Label>
            <Input
              id="resource-name"
              placeholder="e.g., project, task, comment"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                }))
              }
              disabled={!!resource}
              className="font-mono"
            />
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="resource-display-name">Display Name</Label>
            <Input
              id="resource-display-name"
              placeholder="e.g., Project, Task, Comment"
              value={formData.display_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_name: e.target.value,
                }))
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="resource-description">
              Description{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="resource-description"
              placeholder="A short description of what this resource represents…"
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
                : resource
                  ? "Update Resource"
                  : "Create Resource"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
