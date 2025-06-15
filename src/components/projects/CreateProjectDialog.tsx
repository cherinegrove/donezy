import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { ProjectTemplate, CustomField, CustomFieldType } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  const { addProject, clients, projectTemplates, currentUser } = useAppContext();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      customFields: [],
    },
  });

  // Fetch custom fields from Supabase
  useEffect(() => {
    if (open) {
      fetchCustomFields();
    }
  }, [open]);

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .contains('applicable_to', ['projects'])
        .order('field_order');
      
      if (error) throw error;
      
      const fields = data.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type as CustomFieldType,
        description: field.description,
        required: field.required,
        applicableTo: field.applicable_to as ('projects' | 'tasks')[],
        options: field.options,
        reportable: field.reportable,
        order: field.field_order,
        createdAt: field.created_at,
        updatedAt: field.updated_at,
      }));
      
      setCustomFields(fields);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast({
        title: "Error",
        description: "Failed to load custom fields",
        variant: "destructive"
      });
    } finally {
      setLoadingFields(false);
    }
  };

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

  // Get the selected template's custom fields
  const getTemplateCustomFields = () => {
    if (!selectedTemplate || selectedTemplate === "system-default") {
      return customFields; // Show all available custom fields for system default
    }
    
    const template = projectTemplates.find(t => t.id === selectedTemplate);
    if (!template || !template.customFields) {
      return [];
    }
    
    // Return only the custom fields that are included in this template
    return customFields.filter(field => 
      template.customFields?.includes(field.id)
    );
  };

  const templateCustomFields = getTemplateCustomFields();

  const handleTemplateSelect = (templateId: string) => {
    console.log("Selecting template:", templateId);
    setSelectedTemplate(templateId);
    
    if (templateId === "system-default") {
      // Reset custom fields when template changes to system default
      form.setValue("customFields", []);
      return;
    }

    const template = projectTemplates.find(t => t.id === templateId);
    if (template) {
      console.log("Found template with custom fields:", template.customFields);
      // Set due date based on default duration
      if (template.defaultDuration) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.defaultDuration);
        form.setValue("dueDate", dueDate);
      }
      
      // Automatically set custom fields from template
      if (template.customFields && template.customFields.length > 0) {
        console.log("Setting custom fields from template:", template.customFields);
        form.setValue("customFields", template.customFields);
      } else {
        form.setValue("customFields", []);
      }
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    const currentFields = form.getValues("customFields");
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter(id => id !== fieldId)
      : [...currentFields, fieldId];
    
    form.setValue("customFields", newFields);
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!currentUser) {
      console.error("No current user found");
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive"
      });
      return;
    }

    console.log("Creating project with data:", data);
    console.log("Selected template:", selectedTemplate);
    console.log("Custom fields:", data.customFields);

    try {
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
        customFieldIds: data.customFields, // Pass the custom field IDs
      });

      console.log("Project created with ID:", projectId);

      toast({
        title: "Project created",
        description: `${data.name} has been created successfully.`,
      });

      form.reset();
      setSelectedTemplate("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getSelectedTemplateInfo = () => {
    if (!selectedTemplate) return null;
    
    if (selectedTemplate === "system-default") {
      return systemDefaultTemplate;
    }
    
    return projectTemplates.find(t => t.id === selectedTemplate);
  };

  const selectedTemplateInfo = getSelectedTemplateInfo();

  // Check if we should show custom fields selection
  const shouldShowCustomFieldsSelection = () => {
    if (!selectedTemplate || selectedTemplate === "system-default") {
      return templateCustomFields.length > 0;
    }
    
    // For non-system templates, only show selection if template has no predefined custom fields
    const template = projectTemplates.find(t => t.id === selectedTemplate);
    return template && (!template.customFields || template.customFields.length === 0) && templateCustomFields.length > 0;
  };

  // Check if we should show custom fields preview (for templates with predefined fields)
  const shouldShowCustomFieldsPreview = () => {
    if (!selectedTemplate || selectedTemplate === "system-default") {
      return false;
    }
    
    const template = projectTemplates.find(t => t.id === selectedTemplate);
    return template && template.customFields && template.customFields.length > 0;
  };

  if (loadingFields) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Loading custom fields...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

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

            {/* Custom Fields Preview for templates with predefined fields */}
            {shouldShowCustomFieldsPreview() && (
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Template Custom Fields
                  </Label>
                  <p className="text-sm text-muted-foreground">These custom fields are included in the selected template</p>
                </div>
                
                <div className="space-y-2">
                  {templateCustomFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{field.name}</span>
                        {field.required && (
                          <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                        )}
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields Selection for system default or templates without predefined fields */}
            {shouldShowCustomFieldsSelection() && (
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Include Custom Fields
                  </Label>
                  <p className="text-sm text-muted-foreground">Select which custom fields to include in this project</p>
                </div>
                
                <div className="space-y-2">
                  {templateCustomFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Switch
                        id={`field-${field.id}`}
                        checked={form.watch("customFields").includes(field.id)}
                        onCheckedChange={() => handleFieldToggle(field.id)}
                      />
                      <Label htmlFor={`field-${field.id}`} className="flex-1">
                        {field.name}
                        {field.required && (
                          <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customFields.length === 0 && (
              <div className="space-y-4">
                <div>
                  <Label>Custom Fields</Label>
                  <p className="text-sm text-muted-foreground">
                    No custom fields created yet that apply to projects. 
                    Create custom fields in the Custom Fields Manager first.
                  </p>
                </div>
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
