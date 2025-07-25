
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
import { useToast } from "@/hooks/use-toast";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  status: z.string().min(1, "Status is required"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  allocatedHours: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : Number(val),
    z.number().min(0).optional()
  ),
  ownerId: z.string().optional(),
  collaboratorIds: z.array(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  const { updateProject, clients, projectStatuses, users } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      serviceType: "project",
      status: "",
      startDate: "",
      dueDate: "",
      allocatedHours: undefined,
      ownerId: "",
      collaboratorIds: [],
    },
  });

  useEffect(() => {
    if (open && project) {
      console.log("EditProjectDialog: Initializing form with project data:", project);
      form.reset({
        name: project.name || "",
        description: project.description || "",
        clientId: project.clientId || "",
        serviceType: project.serviceType || "project",
        status: project.status || projectStatuses[0]?.value || "",
        startDate: project.startDate || "",
        dueDate: project.dueDate || "",
        allocatedHours: project.allocatedHours || undefined,
        ownerId: (project as any).ownerId || "",
        collaboratorIds: (project as any).collaboratorIds || [],
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
        ownerId: data.ownerId || "",
        collaboratorIds: data.collaboratorIds || [],
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
                      {projectStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
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

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Owner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="">No owner assigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collaboratorIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Collaborators</FormLabel>
                  <Select onValueChange={(value) => {
                    const currentValues = field.value || [];
                    if (!currentValues.includes(value)) {
                      field.onChange([...currentValues, value]);
                    }
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add collaborators" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border shadow-md z-50">
                      {users.filter(user => !(field.value || []).includes(user.id)).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((collaboratorId) => {
                        const collaborator = users.find(u => u.id === collaboratorId);
                        return collaborator ? (
                          <div key={collaboratorId} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                            {collaborator.name}
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(field.value?.filter(id => id !== collaboratorId) || []);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
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
