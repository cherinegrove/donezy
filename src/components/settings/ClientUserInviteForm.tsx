
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
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const clientUserInviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(1, { message: "Please enter a name" }),
  jobTitle: z.string().optional(),
  clientId: z.string({ required_error: "Please select a client" }),
  projectAccess: z.array(z.string()).default([]),
});

type ClientUserInviteValues = z.infer<typeof clientUserInviteSchema>;

export function ClientUserInviteForm() {
  const { toast } = useToast();
  const { inviteUser, clients, projects } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<ClientUserInviteValues>({
    resolver: zodResolver(clientUserInviteSchema),
    defaultValues: {
      email: "",
      name: "",
      jobTitle: "",
      clientId: "",
      projectAccess: [],
    },
  });
  
  const watchClientId = form.watch("clientId");
  
  // Get projects for selected client
  const clientProjects = projects.filter(project => project.clientId === watchClientId);
  
  const onSubmit = (data: ClientUserInviteValues) => {
    setIsLoading(true);
    
    // Call the inviteUser function with client user specific data
    inviteUser({
      email: data.email, 
      name: data.name, 
      role: "client",
      clientId: data.clientId,
      jobTitle: data.jobTitle,
      projectAccess: data.projectAccess,
      // Set default permissions for client users
      permissions: {
        canViewClients: false,
        canEditClients: false,
        canViewProjects: true,
        canEditProjects: false,
        canViewTasks: true,
        canEditTasks: true,
        canViewReports: false,
        canManageUsers: false,
      }
    });
    
    // Reset the form
    form.reset();
    setIsLoading(false);
    toast({
      title: "Client user invited",
      description: `Invitation email sent to ${data.email}`,
    });
  };

  const handleProjectChange = (projectId: string, checked: boolean) => {
    const currentProjects = form.getValues('projectAccess') || [];
    let newProjects: string[];
    
    if (checked) {
      newProjects = [...currentProjects, projectId];
    } else {
      newProjects = currentProjects.filter(id => id !== projectId);
    }
    
    form.setValue('projectAccess', newProjects, { shouldValidate: true });
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
                <Input placeholder="clientuser@example.com" {...field} />
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
                <Input placeholder="Jane Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="Project Manager" {...field} />
              </FormControl>
              <FormDescription>
                Job title at the client company
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The client this user belongs to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchClientId && clientProjects.length > 0 && (
          <div className="space-y-2">
            <FormLabel>Project Access</FormLabel>
            <div className="grid grid-cols-1 gap-2 mt-2 border rounded-md p-4">
              {clientProjects.map((project) => (
                <div key={project.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`project-${project.id}`}
                    className="rounded border-gray-300"
                    checked={form.getValues('projectAccess')?.includes(project.id)}
                    onChange={(e) => 
                      handleProjectChange(project.id, e.target.checked)
                    }
                  />
                  <label
                    htmlFor={`project-${project.id}`}
                    className="text-sm font-medium leading-none"
                  >
                    {project.name}
                  </label>
                </div>
              ))}
            </div>
            <FormDescription>
              Select which projects this client user can access
            </FormDescription>
          </div>
        )}
        
        <Button type="submit" disabled={isLoading || !watchClientId}>
          {isLoading ? "Sending invitation..." : "Send invitation"}
        </Button>
      </form>
    </Form>
  );
}
