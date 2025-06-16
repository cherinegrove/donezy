import { useState } from "react";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CreateTeamCardProps {
  onTeamCreated?: () => void;
}

export function CreateTeamCard({ onTeamCreated }: CreateTeamCardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState("");
  const { addTeam, users } = useAppContext();
  const { toast } = useToast();

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    try {
      addTeam({
        name,
        description,
        memberIds,
        leaderId: leaderId || undefined,
      });

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      // Reset form
      setName("");
      setDescription("");
      setMemberIds([]);
      setLeaderId("");
      setIsCreating(false);
      
      if (onTeamCreated) {
        onTeamCreated();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setMemberIds([]);
    setLeaderId("");
    setIsCreating(false);
  };

  const handleMemberSelect = (userId: string) => {
    if (memberIds.includes(userId)) {
      setMemberIds(memberIds.filter(id => id !== userId));
    } else {
      setMemberIds([...memberIds, userId]);
    }
  };

  const removeMember = (userId: string) => {
    setMemberIds(memberIds.filter(id => id !== userId));
  };

  // Enhanced user filtering and options mapping with safety checks
  const eligibleUsers = React.useMemo(() => {
    console.log("CreateTeamCard: Processing users for options", { users });
    
    if (!users || !Array.isArray(users)) {
      console.warn("CreateTeamCard: Users is not an array or is undefined", { users });
      return [];
    }
    
    // Filter out guest users and client users from team assignment options
    return users.filter(user => {
      if (!user || typeof user !== 'object') {
        console.warn("CreateTeamCard: Invalid user object", { user });
        return false;
      }
      if (user.role === "client" || user.is_guest) {
        return false;
      }
      if (!user.id || typeof user.id !== 'string') {
        console.warn("CreateTeamCard: User missing valid id", { user });
        return false;
      }
      if (!user.name || typeof user.name !== 'string') {
        console.warn("CreateTeamCard: User missing valid name", { user });
        return false;
      }
      return true;
    });
  }, [users]);

  // Show loading state if users haven't loaded yet
  if (isCreating && (!users || users.length === 0)) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading team members...</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCreating) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              placeholder="Enter team name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              placeholder="Enter team description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Team Members</Label>
            <Select value="" onValueChange={handleMemberSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select team members (guests excluded)" />
              </SelectTrigger>
              <SelectContent>
                {eligibleUsers.map((user) => (
                  <SelectItem 
                    key={user.id} 
                    value={user.id}
                    disabled={memberIds.includes(user.id)}
                  >
                    {user.name} {memberIds.includes(user.id) ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Show selected members as badges */}
            {memberIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {memberIds.map((userId) => {
                  const user = eligibleUsers.find(u => u.id === userId);
                  return user ? (
                    <Badge key={userId} variant="secondary" className="text-xs">
                      {user.name}
                      <button
                        type="button"
                        className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                        onClick={() => removeMember(userId)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-leader">Team Leader ID (Optional)</Label>
            <Input
              id="team-leader"
              placeholder="Enter team leader's ID..."
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Create Team
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
      onClick={() => setIsCreating(true)}
    >
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Plus className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Create New Team</h3>
        <p className="text-sm text-muted-foreground text-center">
          Click here to add a new team and assign members
        </p>
      </CardContent>
    </Card>
  );
}
