
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { User, UserPermissions, AccessLevel } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface EditUserDialogProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
}

const defaultPermissions: UserPermissions = {
  projects: "none",
  clients: "none",
  reports: "none",
  templates: "none",
  admin: "none",
  timeTracking: "none",
  tasks: "none",
  users: "none",
  teams: "none",
  billing: "none",
};

export function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { addUser, updateUser, clients, teams, customRoles } = useAppContext();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "developer" as string,
    teamIds: [] as string[],
    clientId: "",
    jobTitle: "",
    phone: "",
    employmentType: "full-time" as "full-time" | "part-time" | "contract",
    billingType: "hourly" as "hourly" | "monthly",
    billingRate: 0,
    currency: "USD",
    clientRole: "",
    userType: "account" as "account" | "guest",
    permissions: defaultPermissions,
    invitedToProjects: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "developer",
        teamIds: user.teamIds || [],
        clientId: user.clientId || "",
        jobTitle: user.jobTitle || "",
        phone: user.phone || "",
        employmentType: user.employmentType || "full-time",
        billingType: user.billingType || "hourly",
        billingRate: user.billingRate || 0,
        currency: user.currency || "USD",
        clientRole: user.clientRole || "",
        userType: user.userType || "account",
        permissions: user.permissions || defaultPermissions,
        invitedToProjects: user.invitedToProjects || [],
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "developer",
        teamIds: [],
        clientId: "",
        jobTitle: "",
        phone: "",
        employmentType: "full-time",
        billingType: "hourly",
        billingRate: 0,
        currency: "USD",
        clientRole: "",
        userType: "account",
        permissions: defaultPermissions,
        invitedToProjects: [],
      });
    }
  }, [user]);

  const handlePermissionChange = (permission: keyof UserPermissions, value: AccessLevel) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const userData = {
      ...formData,
      avatar: user?.avatar || "",
      id: user?.id || Date.now().toString(),
    };

    if (user) {
      updateUser(user.id, userData);
      toast({
        title: "User updated",
        description: `${formData.name} has been updated successfully.`,
      });
    } else {
      addUser(userData);
      toast({
        title: "User created",
        description: `${formData.name} has been added to the system.`,
      });
    }
    
    onClose();
  };

  const permissionKeys = Object.keys(defaultPermissions) as Array<keyof UserPermissions>;
  const accessLevels: AccessLevel[] = ["none", "view", "edit", "admin"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {user ? "Update user information and permissions" : "Create a new user with specific permissions"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Role and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                  {customRoles.map(role => (
                    <SelectItem key={role.id} value={role.name.toLowerCase()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userType">User Type</Label>
              <Select value={formData.userType} onValueChange={(value: "account" | "guest") => setFormData(prev => ({ ...prev, userType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Account User</SelectItem>
                  <SelectItem value="guest">Guest User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Permissions</Label>
            <div className="grid grid-cols-1 gap-4">
              {permissionKeys.map((permission) => (
                <div key={permission} className="flex items-center justify-between">
                  <Label className="capitalize">
                    {permission.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <Select
                    value={formData.permissions[permission]}
                    onValueChange={(value: AccessLevel) => handlePermissionChange(permission, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accessLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {user ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
