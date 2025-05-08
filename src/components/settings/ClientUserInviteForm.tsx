
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";

interface ClientUserInviteFormProps {
  onSuccess?: () => void;
}

export function ClientUserInviteForm({ onSuccess }: ClientUserInviteFormProps) {
  const { clients, projects, inviteUser } = useAppContext();
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  
  // Form submission states
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get client's projects based on selected client
  const clientProjects = projects.filter(project => 
    project.clientId === clientId
  );
  
  // Format projects for multiselect
  const projectOptions = clientProjects.map(project => ({
    value: project.id,
    label: project.name
  }));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Validation
      if (!name || !email || !clientId) {
        throw new Error("Please fill out all required fields");
      }
      
      // Call the inviteUser function with the role set to "client"
      inviteUser(email, name, "client", clientId);
      
      // Show success state and toast notification
      setIsSuccess(true);
      setIsLoading(false);
      toast({
        title: "Success",
        description: `Invitation sent to ${name}`,
      });
      
      // Reset form after successful submission
      setTimeout(() => {
        setName("");
        setEmail("");
        setJobTitle("");
        setClientId("");
        setSelectedProjects([]);
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
        <div className="space-y-2">
          <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Full name" 
            required 
          />
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
            <Label htmlFor="job-title">Job Title</Label>
            <Input 
              id="job-title" 
              value={jobTitle} 
              onChange={(e) => setJobTitle(e.target.value)} 
              placeholder="Job title" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client">Client <span className="text-red-500">*</span></Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Select client" />
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
        
        <div className="space-y-2">
          <Label>Project Access</Label>
          <MultiSelect
            disabled={!clientId}
            options={projectOptions}
            selectedValues={selectedProjects}
            onValueChange={setSelectedProjects}
            placeholder={clientId ? "Select projects" : "Select a client first"}
          />
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
