
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { ProjectTemplate } from "@/types";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  clientId: z.string().min(1, "Client is required"),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  customFields: z.array(z.string()).default([]),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject, clients, projectTemplates, currentUser, customFields } = useAppContext();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      customFields: [],
    },
  });

  // System default template
  const systemDefaultTemplate: ProjectTemplate = {
    id: "system-default",
    name: "System Default",
    description: "Basic project template with default settings",
    serviceType: "project",
    defaultDuration: 30,
    allocatedHours: 0,
    tasks: [],
    createdBy: "system",
    createdAt: new Date().toISOString(),
    usageCount: 0,
    teamIds: [],
  };

  const availableTemplates = [systemDefaultTemplate, ...projectTemplates];

  // Get custom fields that apply to projects
  const projectCustomFields = customFields.filter(field => 
    field.applicableTo.includes('projects')
  );

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId === "system-default") {
      // Reset to default values
      return;
    }

    const template = projectTemplates.find(t => t.id === templateId);
    if (template) {
      // Set due date based on default duration
      if (template.defaultDuration) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.defaultDuration);
        form.setValue("dueDate", dueDate);
      }
    }
  };

  const onSubmit = (data: ProjectFormData) => {
    if (!currentUser) return;

    const projectId = addProject({
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      serviceType: "project", // Default service type
      startDate: data.startDate?.toISOString(),
      dueDate: data.dueDate?.toISOString(),
      allocatedHours: 0, // Default allocated hours
      status: "todo",
      usedHours: 0,
      templateId: selectedTemplate !== "system-default" ? selectedTemplate : undefined,
    });

    toast({
      title: "Project created",
      description: `${data.name} has been created successfully.`,
    });

    form.reset();
    setSelectedTemplate("");
    onOpenChange(false);
  };

  const getSelectedTemplateInfo = () => {
    if (!selectedTemplate) return null;
    
    if (selectedTemplate === "system-default") {
      return systemDefaultTemplate;
    }
    
    return projectTemplates.find(t => t.id === selectedTemplate);
  };

  const selectedTemplateInfo = getSelectedTemplateInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project and assign it to a client.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Template Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Template</label>
                <p className="text-sm text-muted-foreground">Choose a template to pre-fill project settings</p>
              </div>
              
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{template.name}</span>
                        {template.id === "system-default" && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Template Preview */}
              {selectedTemplateInfo && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {selectedTemplateInfo.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedTemplateInfo.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-3 text-xs">
                      {selectedTemplateInfo.defaultDuration && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{selectedTemplateInfo.defaultDuration} days</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

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
                      placeholder="Describe the project"
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
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select start date"
                      />
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
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select due date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Fields Selection */}
            {projectCustomFields.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Custom Fields
                  </label>
                  <p className="text-sm text-muted-foreground">Select which custom fields to include in this project</p>
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
              <Button type="submit">Create Project</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
