import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectTemplateWithTasks } from "@/types/projectTemplate";
import { useEffect } from "react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  serviceType: z.enum(["project", "bank-hours", "pay-as-you-go"]),
  defaultDuration: z.number().min(1, "Duration must be at least 1 day"),
  allocatedHours: z.number().min(0, "Hours must be 0 or greater"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EditTemplateDialogProps {
  template: ProjectTemplateWithTasks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdated: () => void;
}

export function EditTemplateDialog({ 
  template, 
  open, 
  onOpenChange,
  onTemplateUpdated
}: EditTemplateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      serviceType: template?.serviceType || "project",
      defaultDuration: template?.defaultDuration || 30,
      allocatedHours: template?.allocatedHours || 0,
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description,
        serviceType: template.serviceType,
        defaultDuration: template.defaultDuration,
        allocatedHours: template.allocatedHours,
      });
    }
  }, [template, form]);

  const onSubmit = async (data: TemplateFormData) => {
    if (!template) {
      toast({
        title: "Error",
        description: "No template selected for editing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Update the template
      const { error } = await supabase
        .from('project_templates')
        .update({
          name: data.name,
          description: data.description,
          service_type: data.serviceType,
          default_duration: data.defaultDuration,
          allocated_hours: data.allocatedHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id)
        .eq('auth_user_id', user.id);

      if (error) throw error;

      toast({
        title: "Template updated",
        description: `Template "${data.name}" has been updated successfully.`,
      });

      onTemplateUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter template name" {...field} />
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
                      placeholder="Enter template description" 
                      className="resize-none" 
                      {...field} 
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
                      <SelectItem value="project">Fixed Project</SelectItem>
                      <SelectItem value="bank-hours">Bank of Hours</SelectItem>
                      <SelectItem value="pay-as-you-go">Pay As You Go</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Duration (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
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
                      <Input 
                        type="number" 
                        min="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}