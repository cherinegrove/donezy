import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types";
import { useAppContext } from "@/contexts/AppContext";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Project name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  clientName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  budget: z.string().optional(),
  allocatedHours: z.string().optional(),
});

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  const { updateProject } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      clientName: project.clientName || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      status: project.status || "",
      budget: project.budget ? project.budget.toString() : "",
      allocatedHours: project.allocatedHours ? project.allocatedHours.toString() : "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Convert allocatedHours from string to number
      const allocatedHoursNumber = values.allocatedHours ? Number(values.allocatedHours) : 0;
      
      // Update the project with the new values
      updateProject(project.id, {
        ...values,
        allocatedHours: allocatedHoursNumber, // Convert to number here
      });
      
      toast({
        title: "Project updated",
        description: "Project has been updated successfully",
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error("Failed to update project:", error);
      toast({
        title: "Failed to update project",
        description: "There was an error updating the project",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
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
                    <Input placeholder="Project Name" {...field} />
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
                    <Input placeholder="Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl>
                    <Input placeholder="Budget" type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allocatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Hours</FormLabel>
                  <FormControl>
                    <Input placeholder="Allocated Hours" type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Update Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
