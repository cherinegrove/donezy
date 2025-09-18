
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

interface TeamMemberInviteFormProps {
  onSuccess?: () => void;
}

export function TeamMemberInviteForm({ onSuccess }: TeamMemberInviteFormProps) {
  const { currentUser, addUser } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as const,
    jobTitle: ""
  });

  // Debug logging
  console.log("🔍 TeamMemberInviteForm Debug:", {
    isLoading,
    formData,
    currentUser: currentUser?.name || "No user"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    
    try {
      // Send the invite email via Supabase Auth
      const { data, error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          jobTitle: formData.jobTitle,
          inviterName: currentUser.name,
          companyName: "Donezy"
        }
      });

      if (emailError) {
        console.error("Error sending invite email:", emailError);
        
        // Try to get the specific error message from the response
        let errorMessage = "Failed to send invitation email.";
        
        if (data?.error) {
          errorMessage = data.error;
        } else if (emailError.message?.includes("non-2xx")) {
          errorMessage = "A user with this email address already exists. Please use a different email or contact the user directly.";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // Add the user to the system without auth_user_id (indicating pending invite)
      await addUser({
        name: formData.name,
        email: formData.email,
        roleId: "user-role",
        jobTitle: formData.jobTitle,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name}`,
        teamIds: [],
        currency: "USD",
        employmentType: "full-time",
        billingType: "hourly",
        // Don't set auth_user_id - this indicates the invite is pending
        status: 'active' // Will show as "invite sent" due to missing auth_user_id
      });

      toast({
        title: "Team member invited!",
        description: `An invitation email has been sent to ${formData.email}`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        role: "user",
        jobTitle: ""
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error inviting team member:", error);
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
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>
          Send an invitation email to add a new team member
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
                onChange={(e) => {
                  console.log("🔍 TeamMember Name input change:", e.target.value);
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                }}
                placeholder="John Doe"
                required
                onFocus={() => console.log("🔍 TeamMember Name input focused")}
                onBlur={() => console.log("🔍 TeamMember Name input blurred")}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  console.log("🔍 TeamMember Email input change:", e.target.value);
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                }}
                placeholder="john@company.com"
                required
                onFocus={() => console.log("🔍 TeamMember Email input focused")}
                onBlur={() => console.log("🔍 TeamMember Email input blurred")}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Senior Developer"
              />
            </div>
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
      </CardContent>
    </Card>
  );
}
