
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const teamMemberInviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(1, { message: "Please enter a name" }),
  role: z.enum(["admin", "manager", "developer"]),
  employmentType: z.enum(["full-time", "contract", "part-time"]),
  billingType: z.enum(["hourly", "monthly"]),
  billingRate: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Please enter a valid rate",
  }),
  currency: z.string().default("USD"),
  teamIds: z.array(z.string()).default([]),
});

type TeamMemberInviteValues = z.infer<typeof teamMemberInviteSchema>;

export function TeamMemberInviteForm() {
  const { toast } = useToast();
  const { inviteUser, teams } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<TeamMemberInviteValues>({
    resolver: zodResolver(teamMemberInviteSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "developer",
      employmentType: "full-time",
      billingType: "hourly",
      billingRate: "0",
      currency: "USD",
      teamIds: [],
    },
  });
  
  const watchBillingType = form.watch("billingType");
  
  const onSubmit = (data: TeamMemberInviteValues) => {
    setIsLoading(true);
    
    // Call the inviteUser function with team member specific data
    inviteUser({
      email: data.email, 
      name: data.name, 
      role: data.role,
      employmentType: data.employmentType,
      billingType: data.billingType,
      billingRate: parseFloat(data.billingRate),
      currency: data.currency,
      teamIds: data.teamIds,
    });
    
    // Reset the form
    form.reset();
    setIsLoading(false);
    toast({
      title: "Invitation sent",
      description: `Invitation email sent to ${data.email}`,
    });
  };

  const handleTeamChange = (teamId: string, checked: boolean) => {
    const currentTeams = form.getValues('teamIds') || [];
    let newTeams: string[];
    
    if (checked) {
      newTeams = [...currentTeams, teamId];
    } else {
      newTeams = currentTeams.filter(id => id !== teamId);
    }
    
    form.setValue('teamIds', newTeams, { shouldValidate: true });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll send an invitation email to this address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                This determines what the user will be able to access
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="monthly">Monthly Rate</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billingRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchBillingType === "hourly" ? "Hourly Rate" : "Monthly Rate"}
              </FormLabel>
              <FormControl>
                <Input placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Assign to Teams</FormLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`team-${team.id}`}
                  checked={form.getValues('teamIds')?.includes(team.id)}
                  onCheckedChange={(checked) => 
                    handleTeamChange(team.id, checked === true)
                  }
                />
                <label
                  htmlFor={`team-${team.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {team.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending invitation..." : "Send invitation"}
        </Button>
      </form>
    </Form>
  );
}
