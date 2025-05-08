
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface ClientUserInviteFormProps {
  onSuccess?: () => void;
}

export function ClientUserInviteForm({ onSuccess }: ClientUserInviteFormProps) {
  const { clients, inviteUser } = useAppContext();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!firstName || !lastName || !email || !selectedClient) {
        throw new Error("Please fill out all required fields");
      }
      
      const fullName = `${firstName} ${lastName}`;
      
      // Updated to pass options object instead of direct clientId
      inviteUser(email, fullName, "client", {
        clientId: selectedClient
      });
      
      setIsSuccess(true);
      setIsLoading(false);
      toast({
        title: "Success",
        description: `Invitation sent to ${fullName}`,
      });
      
      // Reset form after success
      setTimeout(() => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setSelectedClient("");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        <Select
          value={selectedClient}
          onValueChange={setSelectedClient}
        >
          <SelectTrigger id="client">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-sm font-medium text-destructive">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || isSuccess}>
        {isLoading
          ? "Sending invitation..."
          : isSuccess
          ? "Invitation sent!"
          : "Send Invitation"}
      </Button>
    </form>
  );
}
