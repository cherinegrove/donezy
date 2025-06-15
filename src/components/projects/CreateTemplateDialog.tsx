
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  defaultDuration: z.number().min(1, "Duration must be at least 1 day"),
  customFields: z.array(z.string()).default([]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const { addProjectTemplate, currentUser, customFields } = useAppContext();
  const { toast } = useToast();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDuration: 30,
      customFields: [],
    },
  });

  // Get custom fields that apply to projects
  const projectCustomFields = customFields.filter(field => 
    field.applicableTo.includes('projects')
  );

  const onSubmit = (data: TemplateFormData) => {
    if (!currentUser) return;

    addProjectTemplate({
      name: data.name,
      description: data.description,
      serviceType: "project",
      defaultDuration: data.defaultDuration,
      allocatedHours: 0,
      tasks: [],
      teamIds: [],
      customFields: data.customFields,
    });

    toast({
      title: "Template created",
      description: `${data.name} template has been created successfully.`,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
          <DialogDescription>
            Create a reusable template for projects with predefined settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="Describe this template"
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
              name="defaultDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Duration (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields Selection */}
            {projectCustomFields.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Fields
                  </label>
                  <p className="text-sm text-muted-foreground">Select which custom fields to include in this template</p>
                </div>
                
                <FormField
                  control={form.control}
                  name="customFields"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {projectCustomFields.map((field) => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name="customFields"
                            render={({ field: formField }) => {
                              return (
                                <FormItem
                                  key={field.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={formField.value?.includes(field.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? formField.onChange([...formField.value, field.id])
                                          : formField.onChange(
                                              formField.value?.filter(
                                                (value) => value !== field.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-normal">
                                      {field.name}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </FormLabel>
                                    {field.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {field.description}
                                      </p>
                                    )}
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
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
