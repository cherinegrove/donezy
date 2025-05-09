
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BillingType, EmploymentType } from "@/types";

export interface TeamMemberInviteFormProps {
  onSuccess?: () => void;
}

export function TeamMemberInviteForm({ onSuccess }: TeamMemberInviteFormProps) {
  const { teams, inviteUser } = useAppContext();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("developer");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full-time");
  const [billingType, setBillingType] = useState<BillingType>("hourly");
  const [hourlyRate, setHourlyRate] = useState<string>("0");
  const [monthlyRate, setMonthlyRate] = useState<string>("0");
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleTeamChange = (teamId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!firstName || !lastName || !email || !role) {
        throw new Error("Please fill out all required fields");
      }
      
      const fullName = `${firstName} ${lastName}`;
      
      inviteUser(
        email,
        fullName,
        role,
        {
          phone,
          employmentType: employmentType as EmploymentType,
          billingType: billingType as BillingType,
          hourlyRate: billingType === "hourly" ? parseFloat(hourlyRate) : undefined,
          monthlyRate: billingType === "monthly" ? parseFloat(monthlyRate) : undefined,
          billingRate: billingType === "hourly" ? parseFloat(hourlyRate) : parseFloat(monthlyRate),
          currency,
          teamIds: selectedTeams,
        }
      );
      
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
        setPhone("");
        setRole("developer");
        setEmploymentType("full-time");
        setBillingType("hourly");
        setHourlyRate("0");
        setMonthlyRate("0");
        setCurrency("USD");
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
        <Label htmlFor="phone">Phone Number (optional)</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={role}
            onValueChange={setRole}
          >
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
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            value={employmentType}
            onValueChange={(value) => setEmploymentType(value as EmploymentType)}
          >
            <SelectTrigger id="employmentType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full Time</SelectItem>
              <SelectItem value="part-time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billingType">Billing Type</Label>
          <Select
            value={billingType}
            onValueChange={(value) => setBillingType(value as BillingType)}
          >
            <SelectTrigger id="billingType">
              <SelectValue placeholder="Select billing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingRate">
            {billingType === "hourly" ? "Hourly Rate" : "Monthly Rate"}
          </Label>
          <div className="flex">
            <Input
              id="billingRate"
              type="number"
              value={billingType === "hourly" ? hourlyRate : monthlyRate}
              onChange={(e) => {
                if (billingType === "hourly") {
                  setHourlyRate(e.target.value);
                } else {
                  setMonthlyRate(e.target.value);
                }
              }}
              min="0"
              step="0.01"
              className="rounded-r-none"
            />
            <Select
              value={currency}
              onValueChange={setCurrency}
            >
              <SelectTrigger className="w-[30%] rounded-l-none border-l-0">
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="ZAR">ZAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Teams (optional)</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`team-${team.id}`}
                checked={selectedTeams.includes(team.id)}
                onChange={() => handleTeamChange(team.id)}
                className="h-4 w-4"
              />
              <Label htmlFor={`team-${team.id}`} className="font-normal">
                {team.name}
              </Label>
            </div>
          ))}
        </div>
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
