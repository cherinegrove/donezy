
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckboxGroup, CheckboxGroupItem } from "@/components/ui/checkboxGroup";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditClientDialogProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

export const EditClientDialog = ({ client, isOpen, onClose }: EditClientDialogProps) => {
  const { updateClient, teams } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState(client.name);
  const [contactName, setContactName] = useState(client.contactName);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address || "");
  const [website, setWebsite] = useState(client.website || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [status, setStatus] = useState<'active' | 'inactive'>(client.status);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(client.teamIds || []);

  const handleSave = () => {
    updateClient(client.id, {
      name,
      contactName,
      email,
      phone,
      address: address || undefined,
      website: website || undefined,
      notes: notes || undefined,
      status,
      teamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
    });

    toast({
      title: "Client Updated",
      description: "The client has been updated successfully",
    });

    onClose();
  };

  const handleTeamChange = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: 'active' | 'inactive') => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assigned Teams</Label>
            {teams.length > 0 ? (
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <CheckboxGroup>
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center space-x-2 py-1">
                      <CheckboxGroupItem 
                        id={`team-${team.id}`}
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => handleTeamChange(team.id)}
                      />
                      <Label htmlFor={`team-${team.id}`} className="cursor-pointer">
                        {team.name}
                      </Label>
                    </div>
                  ))}
                </CheckboxGroup>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No teams available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
