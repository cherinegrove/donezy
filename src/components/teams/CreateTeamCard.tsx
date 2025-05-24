
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { MultiSelect } from "@/components/ui/multi-select";

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

  // Filter out guest users and client users from team assignment options
  const eligibleUsers = users.filter(user => user.role !== "client" && !user.isGuest);
  const userOptions = eligibleUsers.map(user => ({
    value: user.id,
    label: user.name
  }));

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
            <MultiSelect
              options={userOptions}
              selectedValues={memberIds}
              onValueChange={setMemberIds}
              placeholder="Select team members (guests excluded)"
            />
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
