
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

interface ClientUserInviteFormProps {
  onSuccess?: () => void;
}

export function ClientUserInviteForm({ onSuccess }: ClientUserInviteFormProps) {
  const { currentUser, addUser, clients } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    clientId: "",
    clientRole: "primary" as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    
    try {
      // Create the invite link for client user
      const inviteLink = `${window.location.origin}/signup?invite=${encodeURIComponent(formData.email)}&role=client&clientId=${formData.clientId}`;
      
      // Send the invite email
      const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: formData.email,
          name: formData.name,
          role: "Client User",
          inviterName: currentUser.name,
          companyName: "Your Organization",
          inviteLink: inviteLink
        }
      });

      if (emailError) {
        console.error("Error sending invite email:", emailError);
        toast({
          title: "Error",
          description: "Failed to send invitation email. Please check your email configuration.",
          variant: "destructive"
        });
        return;
      }

      // Add the client user to the system
      await addUser({
        name: formData.name,
        email: formData.email,
        role: "client",
        clientId: formData.clientId,
        clientRole: formData.clientRole,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}`,
        teamIds: [],
        currency: "USD",
        is_guest: true,
        guestOfUserId: currentUser.id,
        guestPermissions: {
          canViewProjects: true,
          canViewTasks: true,
          canEditTasks: false,
          canViewClients: false,
          canViewReports: true
        }
      });

      toast({
        title: "Client user invited!",
        description: `An invitation email has been sent to ${formData.email}`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        clientId: "",
        clientRole: "primary"
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error inviting client user:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Client User</CardTitle>
        <CardDescription>
          Send an invitation email to add a new client user with limited access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jane Smith"
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
                placeholder="jane@client.com"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientId">Associated Client</Label>
              <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="clientRole">Client Role</Label>
              <Select value={formData.clientRole} onValueChange={(value: any) => setFormData(prev => ({ ...prev, clientRole: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Contact</SelectItem>
                  <SelectItem value="secondary">Secondary Contact</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" disabled={isLoading || !formData.clientId} className="w-full">
            {isLoading ? (
              "Sending Invitation..."
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
