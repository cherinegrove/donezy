import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
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
  status: z.enum(["todo", "in-progress", "done"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  allocatedHours: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : Number(val),
    z.number().min(0).optional()
  ),
  teamIds: z.array(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  const { updateProject, clients, users } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("EditProjectDialog: Rendering with project", project?.id, "and users", { 
    usersCount: users?.length || 0,
    projectTeamIds: project?.teamIds
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      serviceType: "project",
      status: "todo",
      startDate: "",
      dueDate: "",
      allocatedHours: undefined,
      teamIds: [], // Ensure it's always an empty array, not undefined
    },
  });

  useEffect(() => {
    if (open && project) {
      console.log("EditProjectDialog: Initializing form with project data:", project);
      // Reset form with current project data, ensuring teamIds is always an array
      form.reset({
        name: project.name || "",
        description: project.description || "",
        clientId: project.clientId || "",
        serviceType: project.serviceType || "project",
        status: project.status || "todo",
        startDate: project.startDate || "",
        dueDate: project.dueDate || "",
        allocatedHours: project.allocatedHours || undefined,
        teamIds: Array.isArray(project.teamIds) ? project.teamIds : [],
      });
    }
  }, [form, open, project]);

  const onSubmit = async (data: ProjectFormData) => {
    if (!project) {
      console.error("EditProjectDialog: No project to update");
      toast({
        title: "Error",
        description: "No project selected for editing.",
        variant: "destructive",
      });
      return;
    }

    console.log("EditProjectDialog: Submitting project update:", data);
    setIsSubmitting(true);
    
    try {
      await updateProject(project.id, {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        serviceType: data.serviceType,
        status: data.status,
        startDate: data.startDate || "",
        dueDate: data.dueDate || "",
        allocatedHours: data.allocatedHours || 0,
        teamIds: data.teamIds || [],
      });

      toast({
        title: "Project updated",
        description: `${data.name} has been updated successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("EditProjectDialog: Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project && open) {
    console.warn("EditProjectDialog: No project provided but dialog is open");
    return null;
  }

  const activeClients = clients.filter(client => client.status === "active");
  
  // Show loading state if users haven't loaded yet
  if (!users || users.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project information and settings.
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                        console.log("EditProjectDialog: TeamMemberSelect changed:", values);
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
