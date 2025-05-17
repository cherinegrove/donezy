
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Team, User } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditTeamDialogProps {
  team?: Team;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTeamDialog({ team, isOpen, onClose }: EditTeamDialogProps) {
  const { addTeam, updateTeam, users, deleteTeam, currentUser } = useAppContext();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';
  
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description);
      setMembers(team.members);
    } else {
      setName("");
      setDescription("");
      setMembers([]);
    }
  }, [team]);
  
  // Get only users that aren't clients (for team membership)
  const teamUsers = users.filter((user) => user.role !== "client");
  
  // Format users for MultiSelect component
  const userOptions = teamUsers.map((user: User) => ({
    value: user.id,
    label: user.name,
    avatar: user.avatar,
    initials: user.name.substring(0, 2),
  }));

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    if (team) {
      // Update existing team
      updateTeam(team.id, {
        name,
        description,
        members,
      });

      toast({
        title: "Team Updated",
        description: "Team has been updated successfully",
      });
    } else {
      // Create new team
      addTeam({
        name,
        description,
        members,
        projectIds: [],
      });

      toast({
        title: "Team Created",
        description: "New team has been created successfully",
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (team) {
      deleteTeam(team.id);
      toast({
        title: "Team Deleted",
        description: "The team has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{team ? "Edit Team" : "Create Team"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter team description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Members</Label>
              <MultiSelect
                options={userOptions}
                selectedValues={members}
                onValueChange={setMembers}
                placeholder="Select team members"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div>
              {isAdmin && team && (
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>{team ? "Update Team" : "Create Team"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team
              and remove all member associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
