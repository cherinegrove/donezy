
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Project, TaskStatus } from "@/types";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const projectSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string(),
  clientId: z.string().min(1, { message: "Client is required" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  dueDate: z.string().optional(),
  hasHourLimit: z.boolean().default(false),
  allocatedHours: z.string().optional().transform(val => val ? Number(val) : undefined),
  status: z.enum(["backlog", "todo", "in-progress", "review", "done"]),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
  project: Project;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, isOpen, onOpenChange }: EditProjectDialogProps) {
  const { clients, users, updateProject, deleteProject, currentUser } = useAppContext();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Filter to only active clients
  const activeClients = clients.filter(client => client.status === 'active');
  
  // Filter to only get team members (non-client users)
  const teamMembers = users.filter(user => user.clientId === undefined);
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      clientId: project.clientId,
      startDate: project.startDate ? project.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
      dueDate: project.dueDate ? project.dueDate.split("T")[0] : undefined,
      hasHourLimit: !!project.allocatedHours,
      allocatedHours: project.allocatedHours?.toString() || "",
      status: project.status || "todo",
    },
  });
  
  // Initialize selected members - ensure we handle undefined memberIds
  useEffect(() => {
    if (project.memberIds && Array.isArray(project.memberIds)) {
      setSelectedMembers(project.memberIds);
    } else {
      // Initialize with empty array if memberIds is undefined
      setSelectedMembers([]);
    }
  }, [project]);

  const onSubmit = (data: ProjectFormData) => {
    // Convert allocatedHours from string to number if hasHourLimit is true
    const allocatedHours = data.hasHourLimit && data.allocatedHours 
      ? Number(data.allocatedHours) 
      : undefined;

    updateProject(project.id, {
      ...data,
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      memberIds: selectedMembers, 
      startDate: data.startDate,
      dueDate: data.dueDate,
      allocatedHours: allocatedHours,
      status: data.status as TaskStatus,
    });
    
    toast({
      title: "Project updated",
      description: "The project has been successfully updated.",
    });
    
    onOpenChange(false);
  };
  
  const hasHourLimit = form.watch("hasHourLimit");
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';
  
  // Convert users to options for MultiSelect
  const memberOptions = teamMembers.map(member => ({
    value: member.id,
    label: member.name
  }));
  
  const handleDelete = () => {
    deleteProject(project.id);
    
    toast({
      title: "Project deleted",
      description: "The project has been permanently deleted.",
      variant: "destructive",
    });
    
    setShowDeleteDialog(false);
    onOpenChange(false);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Make changes to your project here. Click save when you're done.</DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Project description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeClients.length > 0 ? (
                              activeClients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-clients" disabled>
                                No active clients available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <Label>Assign Team Members</Label>
                  <MultiSelect
                    options={memberOptions}
                    selectedValues={selectedMembers}
                    onValueChange={setSelectedMembers}
                    placeholder="Select team members"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">Todo</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hasHourLimit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Hour Limit</FormLabel>
                      <FormDescription>
                        Set a limit on the number of hours that can be used for this project.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {hasHourLimit && (
                <FormField
                  control={form.control}
                  name="allocatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocated Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter hours"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter className="flex items-center justify-between">
                <div>
                  {isAdmin && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all associated tasks and time entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
