
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";

interface CreateTeamCardProps {
  onTeamCreated?: () => void;
}

export function CreateTeamCard({ onTeamCreated }: CreateTeamCardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { addTeam } = useAppContext();
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
        memberIds: [],
      });

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      // Reset form
      setName("");
      setDescription("");
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
    setIsCreating(false);
  };

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
          Click here to add a new team
        </p>
      </CardContent>
    </Card>
  );
}
