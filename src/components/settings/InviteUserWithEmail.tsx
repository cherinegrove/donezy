
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Mail } from "lucide-react";

interface InviteUserWithEmailProps {
  onSuccess?: () => void;
}

export function InviteUserWithEmail({ onSuccess }: InviteUserWithEmailProps) {
  const { currentUser, addUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    console.log("🔍 Starting invite process for:", formData.email);
    setIsLoading(true);
    
    try {
      // Create the invite link using your configured domain
      const inviteLink = `https://app.donezy.io/signup`;
      
      // Send the invite email
      console.log("🔍 Calling send-invite-email function...");
      const { data, error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          inviterName: currentUser.name,
          companyName: "Donezy",
          inviteLink: inviteLink
        }
      });

      console.log("🔍 Function response:", { data, emailError });

      if (emailError) {
        console.error("Error sending invite email:", emailError);
        toast({
          title: "Error",
          description: "Failed to send invitation email. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Add the user to the system as "invited"
      await addUser({
        name: formData.name,
        email: formData.email,
        roleId: "user-role",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}`,
        teamIds: [],
        currency: "USD"
      });

      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${formData.email}`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "user"
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error inviting user:", error);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Invite New User</h3>
      </div>
      
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
        <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
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
  );
}
