
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useToast } from "@/hooks/use-toast";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface ConvertToTemplateDialogProps {
  project?: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertToTemplateDialog({ 
  project, 
  open, 
  onOpenChange 
}: ConvertToTemplateDialogProps) {
  const { convertProjectToTemplate } = useAppContext();
  const { toast } = useToast();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: project?.name ? `${project.name} Template` : "New Template",
      description: project?.name ? `Template based on ${project.name}` : "Template description",
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    if (!project) {
      toast({
        title: "Error",
        description: "No project selected for template conversion.",
        variant: "destructive",
      });
      return;
    }

    try {
      await convertProjectToTemplate(project.id, {
        name: data.name,
        description: data.description,
      });

      toast({
        title: "Template created",
        description: `Template "${data.name}" has been created from project "${project.name}".`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't render if no project is provided
  if (!project) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Convert to Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from "{project.name}".
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Template name" {...field} />
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
                    <Textarea placeholder="Template description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Template</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
