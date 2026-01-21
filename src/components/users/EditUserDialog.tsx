import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { User } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert } from "lucide-react";

interface SystemRole {
  id: string;
  name: 'platform_admin' | 'support_admin';
  description: string | null;
}

interface EditUserDialogProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { addUser, updateUser, teams, currentUser } = useAppContext();
  const { toast } = useToast();
  
  const fallbackTeams = [
    { id: "development", name: "Development" },
    { id: "design", name: "Design" },
    { id: "marketing", name: "Marketing" }
  ];
  
  const availableTeams = teams.length > 0 ? teams : fallbackTeams;
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive' | 'deleted'>('active');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  
  // System roles state
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [selectedSystemRole, setSelectedSystemRole] = useState<string>("none");
  const [currentUserSystemRoleId, setCurrentUserSystemRoleId] = useState<string | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const isEditing = !!user;
  
  // Check if current user can assign system roles
  const canAssignRoles = currentUser?.systemRoles?.includes('platform_admin');

  // Load system roles and user's current role assignment
  useEffect(() => {
    const loadSystemRoles = async () => {
      if (!isOpen) return;
      
      setLoadingRoles(true);
      try {
        // Fetch available system roles
        const { data: roles, error: rolesError } = await supabase
          .from('system_roles')
          .select('*');
        
        if (rolesError) throw rolesError;
        setSystemRoles(roles || []);
        
        // If editing, fetch user's current system role
        if (user) {
          const { data: userRoles, error: userRolesError } = await supabase
            .from('user_system_roles')
            .select('id, system_role_id')
            .eq('user_id', user.auth_user_id)
            .maybeSingle();
          
          if (userRolesError && userRolesError.code !== 'PGRST116') {
            console.error('Error fetching user system role:', userRolesError);
          }
          
          if (userRoles) {
            setSelectedSystemRole(userRoles.system_role_id);
            setCurrentUserSystemRoleId(userRoles.id);
          } else {
            setSelectedSystemRole("none");
            setCurrentUserSystemRoleId(null);
          }
        }
      } catch (error) {
        console.error('Error loading system roles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };
    
    loadSystemRoles();
  }, [isOpen, user]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setJobTitle(user.jobTitle || "");
      setPhone(user.phone || "");
      setStatus(user.status || 'active');
      setSelectedTeamIds(user.teamIds || []);
    } else {
      setName("");
      setEmail("");
      setJobTitle("");
      setPhone("");
      setStatus('active');
      setSelectedTeamIds([]);
      setSelectedSystemRole("none");
      setCurrentUserSystemRoleId(null);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && user) {
        // Update user basic info
        updateUser(user.auth_user_id, {
          name,
          email,
          jobTitle,
          phone,
          status,
          teamIds: selectedTeamIds
        });
        
        // Handle system role changes if user can assign roles
        if (canAssignRoles) {
          // Remove existing role if changing to none or different role
          if (currentUserSystemRoleId && selectedSystemRole !== currentUserSystemRoleId) {
            await supabase
              .from('user_system_roles')
              .delete()
              .eq('id', currentUserSystemRoleId);
          }
          
          // Add new role if selected
          if (selectedSystemRole !== "none" && selectedSystemRole !== currentUserSystemRoleId) {
            const { error: insertError } = await supabase
              .from('user_system_roles')
              .insert({
                user_id: user.auth_user_id,
                system_role_id: selectedSystemRole,
                assigned_by: currentUser?.auth_user_id
              });
            
            if (insertError) {
              console.error('Error assigning system role:', insertError);
              toast({
                title: "Warning",
                description: "User updated but system role assignment failed",
                variant: "destructive",
              });
            }
          }
        }
        
        toast({
          title: "User updated",
          description: "The user has been updated successfully.",
        });
      } else {
        addUser({
          name,
          email,
          jobTitle,
          phone,
          roleId: "user", // Default roleId for backwards compatibility
          status,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
          teamIds: selectedTeamIds,
          currency: "USD"
        });
        
        toast({
          title: "User created",
          description: "The user has been created successfully. System role can be assigned after creation.",
        });
      }

      // Reset form
      setName("");
      setEmail("");
      setJobTitle("");
      setPhone("");
      setStatus('active');
      setSelectedTeamIds([]);
      setSelectedSystemRole("none");
      setCurrentUserSystemRoleId(null);
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description: "There was a problem saving the user",
        variant: "destructive",
      });
    }
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const getSystemRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'platform_admin':
        return 'Platform Admin';
      case 'support_admin':
        return 'Support Admin';
      default:
        return roleName;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="sm:max-w-[500px] pointer-events-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit User" : "Add New User"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Senior Developer"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* System Role Selector */}
            <div>
              <Label htmlFor="systemRole" className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                System Role
              </Label>
              <Select 
                value={selectedSystemRole} 
                onValueChange={setSelectedSystemRole}
                disabled={!canAssignRoles || loadingRoles || !isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingRoles ? "Loading..." : "Select role"} />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted" />
                      <span>Regular User</span>
                    </div>
                  </SelectItem>
                  {systemRoles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-primary" />
                        <span>{getSystemRoleLabel(role.name)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canAssignRoles && (
                <p className="text-xs text-muted-foreground mt-1">
                  Only Platform Admins can assign system roles
                </p>
              )}
              {!isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  System role can be assigned after user is created
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'inactive' | 'deleted') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current role display */}
          {isEditing && user?.systemRoles && user.systemRoles.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm">Current roles:</span>
              {user.systemRoles.map(role => (
                <Badge key={role} variant="secondary" className="bg-primary/10 text-primary">
                  {getSystemRoleLabel(role)}
                </Badge>
              ))}
            </div>
          )}

           <div>
             <Label>Teams</Label>
             <div className="grid grid-cols-2 gap-2 mt-2">
               {availableTeams.map((team) => (
                 <div key={team.id} className="flex items-center space-x-2">
                   <Checkbox
                     id={`team-${team.id}`}
                     checked={selectedTeamIds.includes(team.id)}
                     onCheckedChange={() => handleTeamToggle(team.id)}
                   />
                   <Label 
                     htmlFor={`team-${team.id}`} 
                     className="text-sm font-normal cursor-pointer"
                   >
                     {team.name}
                   </Label>
                 </div>
               ))}
             </div>
           </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
