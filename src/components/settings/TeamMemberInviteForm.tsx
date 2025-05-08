
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";

interface TeamMemberInviteFormProps {
  onSuccess?: () => void;
}

export function TeamMemberInviteForm({ onSuccess }: TeamMemberInviteFormProps) {
  const { teams, inviteUser } = useAppContext();
  const { toast } = useToast();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("developer");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // Form submission states
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Format teams for multiselect
  const teamOptions = teams.map(team => ({
    value: team.id,
    label: team.name
  }));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validation
      if (!firstName || !lastName || !email || !role) {
        throw new Error("Please fill out all required fields");
      }
      
      const fullName = `${firstName} ${lastName}`;
      
      // Call the inviteUser function with the specified role
      inviteUser(email, fullName, role);
      
      // Show success state and toast notification
      setIsSuccess(true);
      setIsLoading(false);
      toast({
        title: "Success",
        description: `Invitation sent to ${fullName}`,
      });
      
      // Reset form after successful submission
      setTimeout(() => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setRole("developer");
        setSelectedTeams([]);
        setIsSuccess(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">First Name <span className="text-red-500">*</span></Label>
            <Input 
              id="first-name" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              placeholder="First name" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last-name">Last Name <span className="text-red-500">*</span></Label>
            <Input 
              id="last-name" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              placeholder="Last name" 
              required 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email address" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="Phone number" 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teams">Teams</Label>
            <MultiSelect
              options={teamOptions}
              selectedValues={selectedTeams}
              onValueChange={setSelectedTeams}
              placeholder="Select teams"
            />
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 p-3 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <Button type="submit" className="w-full" disabled={isLoading || isSuccess}>
          {isLoading ? "Sending Invitation..." : isSuccess ? (
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" /> Invitation Sent
            </span>
          ) : "Send Invitation"}
        </Button>
      </div>
    </form>
  );
}
