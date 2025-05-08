
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { EmploymentType, BillingType } from "@/types";

export function TeamMemberInviteForm() {
  const { teams, inviteUser } = useAppContext();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [employmentType, setEmploymentType] = useState<string>("full-time");
  const [billingType, setBillingType] = useState<string>("hourly");
  const [billingRate, setBillingRate] = useState("");
  const [currency, setCurrency] = useState("USD");
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
      if (!name || !email || !role) {
        throw new Error("Please fill out all required fields");
      }
      
      // Call the inviteUser function with the correct parameters
      inviteUser(email, name, role);
      
      // Show success state
      setIsSuccess(true);
      setIsLoading(false);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setName("");
        setEmail("");
        setRole("developer");
        setEmploymentType("full-time");
        setBillingType("hourly");
        setBillingRate("");
        setCurrency("USD");
        setSelectedTeams([]);
        setIsSuccess(false);
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
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Full name" 
              required 
            />
          </div>
          
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
        </div>
        
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
          <Label htmlFor="employment-type">Employment Type</Label>
          <Select value={employmentType} onValueChange={setEmploymentType}>
            <SelectTrigger id="employment-type">
              <SelectValue placeholder="Select employment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full Time</SelectItem>
              <SelectItem value="part-time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="billing-type">Billing Type</Label>
          <Select value={billingType} onValueChange={setBillingType}>
            <SelectTrigger id="billing-type">
              <SelectValue placeholder="Select billing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing-rate">Billing Rate</Label>
            <Input 
              id="billing-rate" 
              type="number" 
              value={billingRate} 
              onChange={(e) => setBillingRate(e.target.value)} 
              placeholder="Rate" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Team Assignment</Label>
          <MultiSelect
            options={teamOptions}
            selectedValues={selectedTeams}
            onValueChange={setSelectedTeams}
            placeholder="Select teams"
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
