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
import { getUserRole } from "@/utils/roleUtils";

interface EditUserDialogProps {
  user?: User;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { addUser, updateUser, teams, customRoles } = useAppContext();
  const { toast } = useToast();

  // Debug logging
  console.log("🔍 EditUserDialog Debug:", {
    isOpen,
    isEditing: !!user,
    userName: user?.name || "No user (creating new)",
    teamsCount: teams?.length || 0,
    customRolesCount: customRoles?.length || 0
  });
  
  // Fallback options when context data is empty
  const fallbackRoles = [
    { id: "admin", name: "Admin", color: "#ef4444", isBuiltIn: true },
    { id: "manager", name: "Manager", color: "#f59e0b", isBuiltIn: true },
    { id: "user", name: "User", color: "#10b981", isBuiltIn: true }
  ];
  
  const fallbackTeams = [
    { id: "development", name: "Development" },
    { id: "design", name: "Design" },
    { id: "marketing", name: "Marketing" }
  ];
  
  const availableRoles = customRoles.length > 0 ? customRoles : fallbackRoles;
  const availableTeams = teams.length > 0 ? teams : fallbackTeams;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setJobTitle(user.jobTitle || "");
      setPhone(user.phone || "");
      setRoleId(user.roleId);
      setStatus(user.status || 'active');
      setSelectedTeamIds(user.teamIds || []);
    } else {
      setName("");
      setEmail("");
      setJobTitle("");
      setPhone("");
      setRoleId(availableRoles.find(r => r.name === 'User')?.id || "");
      setStatus('active');
      setSelectedTeamIds([]);
    }
  }, [user, availableRoles, isOpen]);

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

    if (!roleId) {
      toast({
        title: "Error", 
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && user) {
        updateUser(user.auth_user_id, {
          name,
          email,
          jobTitle,
          phone,
          roleId,
          status,
          teamIds: selectedTeamIds
        });
        
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
          roleId,
          status,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
          teamIds: selectedTeamIds,
          currency: "USD"
        });
        
        toast({
          title: "User created",
          description: "The user has been created successfully.",
        });
      }

      setName("");
      setEmail("");
      setJobTitle("");
      setPhone("");
      setRoleId(availableRoles.find(r => r.name === 'User')?.id || "");
      setStatus('active');
      setSelectedTeamIds([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onOpenAutoFocus={(e) => {
          console.log("🔍 Dialog auto focus event");
          // Don't prevent default - let it focus naturally
        }}
        onPointerDownOutside={(e) => {
          console.log("🔍 Dialog pointer down outside");
        }}
      >
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
                onChange={(e) => {
                  console.log("🔍 EditUserDialog Name input change:", e.target.value);
                  console.log("🔍 Input event details:", {
                    target: e.target,
                    type: e.type,
                    currentTarget: e.currentTarget,
                    disabled: e.target.disabled,
                    readOnly: e.target.readOnly,
                    computedStyle: window.getComputedStyle(e.target),
                    parentElement: e.target.parentElement?.tagName,
                    inputValue: e.target.value,
                    selectionStart: e.target.selectionStart,
                    selectionEnd: e.target.selectionEnd
                  });
                  setName(e.target.value);
                }}
                placeholder="John Doe"
                required
                onFocus={() => console.log("🔍 EditUserDialog Name input focused")}
                onBlur={() => console.log("🔍 EditUserDialog Name input blurred")}
                onClick={() => console.log("🔍 EditUserDialog Name input clicked")}
                onMouseEnter={() => console.log("🔍 EditUserDialog Name input mouse enter")}
                onKeyDown={(e) => console.log("🔍 Key pressed:", e.key, "Input value:", e.currentTarget.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  console.log("🔍 EditUserDialog Email input change:", e.target.value);
                  setEmail(e.target.value);
                }}
                placeholder="john@company.com"
                required
                onFocus={() => console.log("🔍 EditUserDialog Email input focused")}
                onBlur={() => console.log("🔍 EditUserDialog Email input blurred")}
                onClick={() => console.log("🔍 EditUserDialog Email input clicked")}
                onMouseEnter={() => console.log("🔍 EditUserDialog Email input mouse enter")}
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
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                 <SelectContent>
                   {availableRoles.map(role => (
                     <SelectItem key={role.id} value={role.id}>
                       <div className="flex items-center gap-2">
                         {role.color && (
                           <div 
                             className="w-3 h-3 rounded-full" 
                             style={{ backgroundColor: role.color }}
                           />
                         )}
                         <span>{role.name}</span>
                         {role.isBuiltIn && (
                           <span className="text-xs text-muted-foreground">(Built-in)</span>
                         )}
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'inactive') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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