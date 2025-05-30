import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamMemberSelect } from "./TeamMemberSelect";
import { useToast } from "@/hooks/use-toast";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  allocatedHours: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : Number(val),
    z.number().min(0).optional()
  ),
  teamIds: z.array(z.string()).default([]), // Ensure it's always an array of strings
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { clients, users, session } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("CreateProjectDialog: Rendering with users", { 
    usersCount: users?.length || 0,
    users: users?.slice(0, 3) // Log first 3 users for debugging
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      serviceType: "project",
      startDate: "",
      dueDate: "",
      allocatedHours: undefined,
      teamIds: [], // Ensure it's always an empty array, not undefined
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project.",
        variant: "destructive",
      });
      return;
    }

    console.log("CreateProjectDialog: Submitting project data:", data);
    setIsSubmitting(true);
    
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          auth_user_id: session.user.id,
          client_id: data.clientId,
          name: data.name,
          description: data.description,
          service_type: data.serviceType,
          start_date: data.startDate || null,
          due_date: data.dueDate || null,
          allocated_hours: data.allocatedHours || 0,
          team_ids: data.teamIds || [],
          status: 'todo',
          used_hours: 0,
          watcher_ids: [],
        })
        .select()
        .single();

      if (error) {
        console.error("CreateProjectDialog: Error creating project:", error);
        throw error;
      }

      console.log("CreateProjectDialog: Project created successfully:", project);

      toast({
        title: "Project created",
        description: `${data.name} has been created successfully.`,
      });

      form.reset();
      onOpenChange(false);

      // Navigate to the new project
      if (project?.id) {
        setTimeout(() => {
          navigate(`/projects/${project.id}`);
        }, 200);
      }
    } catch (error) {
      console.error("CreateProjectDialog: Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeClients = clients.filter(client => client.status === "active");
  
  // Show loading state if users haven't loaded yet
  if (!users || users.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Loading team members...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading users...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project with client and timeline information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter project description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeClients.length === 0 ? (
                        <SelectItem value="" disabled>No active clients available</SelectItem>
                      ) : (
                        activeClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Users</FormLabel>
                  <FormControl>
                    <TeamMemberSelect
                      users={users}
                      selectedValues={Array.isArray(field.value) ? field.value : []}
                      onValueChange={(values) => {
                        console.log("CreateProjectDialog: TeamMemberSelect changed:", values);
                        field.onChange(values);
                      }}
                      placeholder="Select team members"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="bank-hours">Bank Hours</SelectItem>
                      <SelectItem value="pay-as-you-go">Pay as You Go</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allocatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Hours</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter allocated hours"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || activeClients.length === 0}>
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
