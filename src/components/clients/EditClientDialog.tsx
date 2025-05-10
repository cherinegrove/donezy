
import { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface EditClientDialogProps {
  client?: Client;
  isOpen: boolean;
  onClose: () => void;
}

export const EditClientDialog = ({ client, isOpen, onClose }: EditClientDialogProps) => {
  const { updateClient, teams } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState(client?.name || "");
  const [contactName, setContactName] = useState(client?.contactName || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [address, setAddress] = useState(client?.address || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [status, setStatus] = useState<"active" | "inactive">(client?.status || "active");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(client?.teamIds || []);

  // Update state when client prop changes
  useEffect(() => {
    if (client) {
      setName(client.name);
      setContactName(client.contactName);
      setEmail(client.email);
      setPhone(client.phone);
      setAddress(client.address || "");
      setNotes(client.notes || "");
      setStatus(client.status || "active");
      setSelectedTeamIds(client.teamIds || []);
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) return;

    if (!name || !contactName || !email || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    updateClient(client.id, {
      name,
      contactName,
      email,
      phone,
      address,
      notes,
      status,
      teamIds: selectedTeamIds,
    });

    toast({
      title: "Client Updated",
      description: "Client information has been updated successfully",
    });
    
    onClose();
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="status">Client Status</Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="status" className="text-sm">
                {status === "active" ? "Active" : "Inactive"}
              </Label>
              <Switch
                id="status"
                checked={status === "active"}
                onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Company name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Person *</Label>
                <Input
                  id="contactName"
                  placeholder="Contact person's name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Complete address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the client"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Assigned Teams</Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2 p-2">
                  {teams.length > 0 ? (
                    teams.map(team => (
                      <div 
                        key={team.id} 
                        className="flex items-center space-x-2 py-2 border-b last:border-0"
                      >
                        <Checkbox 
                          id={`team-${team.id}`}
                          checked={selectedTeamIds.includes(team.id)}
                          onCheckedChange={() => handleTeamToggle(team.id)}
                        />
                        <div className="flex flex-col">
                          <Label 
                            htmlFor={`team-${team.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {team.name}
                          </Label>
                          {team.description && (
                            <p className="text-xs text-muted-foreground">
                              {team.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {team.members.length} members
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">
                      No teams available
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
