
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface ClientUserInviteFormProps {
  clientId?: string;
  onSuccess?: () => void;
}

export function ClientUserInviteForm({ clientId, onSuccess }: ClientUserInviteFormProps) {
  const { currentUser, addUser, clients } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "client" as const,
    clientRole: "primary" as const,
    selectedClientId: clientId || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const targetClientId = clientId || formData.selectedClientId;
    if (!targetClientId) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Add the user to the system
      await addUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        clientRole: formData.clientRole,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}`,
        teamIds: [],
        currency: "USD",
        clientId: targetClientId,
        is_guest: false,
        guest_of_user_id: currentUser.id,
        guest_permissions: {
          canViewClients: true,
          canViewProjects: true,
          canViewTasks: true,
          canEditTasks: false,
          canViewReports: false
        }
      });

      toast({
        title: "User invited!",
        description: `${formData.name} has been added to the client account`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "user",
        clientRole: "primary",
        selectedClientId: clientId || ""
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: "Failed to invite user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Invite New Client User</h3>
      </div>
      
      {!clientId && (
        <div>
          <Label htmlFor="client">Client</Label>
          <Select value={formData.selectedClientId} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedClientId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@company.com"
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.clientRole} onValueChange={(value: any) => setFormData(prev => ({ ...prev, clientRole: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          "Sending Invitation..."
        ) : (
          "Invite User"
        )}
      </Button>
    </form>
  );
}
