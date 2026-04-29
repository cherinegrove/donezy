import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Shield, User as UserIcon, X } from "lucide-react";
import { roleService, userRoleService } from "@/services/rbac";
import type { RbacRole } from "@/types/rbac";
import type { User } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
}: AssignRolesDialogProps) {
  const { toast } = useToast();

  // All available roles in the system
  const [allRoles, setAllRoles] = useState<RbacRole[]>([]);
  // IDs of roles currently assigned to the user
  const [originalRoleIds, setOriginalRoleIds] = useState<Set<string>>(
    new Set(),
  );
  // IDs currently selected in the dialog (working state)
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const userId = user?.auth_user_id;

  useEffect(() => {
    if (!open || !userId) return;

    let isCancelled = false;

    setLoading(true);
    setAllRoles([]);
    setOriginalRoleIds(new Set());
    setSelectedRoleIds(new Set());

    Promise.all([roleService.getAll(), userRoleService.getUserRoles(userId)])
      .then(([roles, userRoles]) => {
        if (isCancelled) return;
        const assigned = new Set(userRoles.map((ur) => ur.role_id));
        setAllRoles(roles);
        setOriginalRoleIds(assigned);
        setSelectedRoleIds(new Set(assigned));
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Failed to load role data", err);
        toast({
          title: "Load failed",
          description: "Could not load roles. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.auth_user_id || saving) return;
    setSaving(true);

    try {
      // Diff: which to add, which to remove
      const toAdd = [...selectedRoleIds].filter(
        (id) => !originalRoleIds.has(id),
      );
      const toRemove = [...originalRoleIds].filter(
        (id) => !selectedRoleIds.has(id),
      );

      await Promise.all([
        ...toAdd.map((roleId) =>
          userRoleService.assignRole(user.auth_user_id, roleId),
        ),
        ...toRemove.map((roleId) =>
          userRoleService.removeRoleByIds(user.auth_user_id, roleId),
        ),
      ]);

      const addedCount = toAdd.length;
      const removedCount = toRemove.length;

      toast({
        title: "Roles updated",
        description:
          addedCount > 0 || removedCount > 0
            ? `${addedCount > 0 ? `Added ${addedCount}` : ""}${addedCount > 0 && removedCount > 0 ? ", " : ""}${removedCount > 0 ? `removed ${removedCount}` : ""} role(s) for ${user.name}.`
            : "No changes were made.",
      });

      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update roles", err);
      toast({
        title: "Save failed",
        description:
          err instanceof Error ? err.message : "Please check the console.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    selectedRoleIds.size !== originalRoleIds.size ||
    [...selectedRoleIds].some((id) => !originalRoleIds.has(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage RBAC Roles</DialogTitle>
          <DialogDescription asChild>
            <div>
              {user && (
                <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {user.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Role list */}
        <div className="mt-2 space-y-1 max-h-[340px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading roles…</span>
            </div>
          ) : allRoles.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No roles found. Create roles in the Roles tab first.
            </p>
          ) : (
            allRoles.map((role) => {
              const checked = selectedRoleIds.has(role.id);
              return (
                <label
                  key={role.id}
                  htmlFor={`role-${role.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-muted/60 transition-colors group"
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  {/* Color dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color || "#10b981" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {role.is_system ? (
                        <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <UserIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {role.name}
                      </span>
                      {role.is_system && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-normal px-1.5 py-0 shrink-0"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {role.permissions.length} perms
                  </span>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 mt-4 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
