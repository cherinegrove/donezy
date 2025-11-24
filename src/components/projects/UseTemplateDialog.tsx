import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import { addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ListChecks, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ProjectTemplate } from "@/types";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const useTemplateSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  startDate: z.string().min(1, "Start date is required"),
  dueDate: z.string().optional(),
});

type UseTemplateFormData = z.infer<typeof useTemplateSchema>;

interface UseTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
}

export function UseTemplateDialog({
  open,
  onOpenChange,
  templateId,
}: UseTemplateDialogProps) {
  const { projectTemplates, clients, users, createProjectFromTemplate } = useAppContext();
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Filter to only get team members (non-client users)
  const teamMembers = users.filter(user => user.clientId === undefined);
  
  const form = useForm<UseTemplateFormData>({
    resolver: zodResolver(useTemplateSchema),
    defaultValues: {
      name: "",
      clientId: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
    },
  });

  useEffect(() => {
    // Find template by id if provided
    if (templateId) {
      const template = projectTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        
        // Set default name
        form.setValue("name", template.name);
        
        // If template has default duration, set dueDate
        if (template.defaultDuration) {
          const startDate = new Date(form.getValues("startDate"));
          const dueDate = addDays(startDate, template.defaultDuration);
          form.setValue("dueDate", dueDate.toISOString().split("T")[0]);
        }
      }
    }
  }, [templateId, projectTemplates, form]);

  const handleMemberSelect = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(id => id !== memberId));
  };

  const onSubmit = (data: UseTemplateFormData) => {
    if (!selectedTemplate) return;
    
    createProjectFromTemplate(selectedTemplate.id, {
      name: data.name,
      clientId: data.clientId,
      startDate: data.startDate,
      dueDate: data.dueDate,
      memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
    });
    
    form.reset();
    setSelectedMembers([]);
    onOpenChange(false);
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    
    // Set default name
    form.setValue("name", template.name);
    
    // If template has default duration, set dueDate
    if (template.defaultDuration) {
      const startDate = new Date(form.getValues("startDate"));
      const dueDate = addDays(startDate, template.defaultDuration);
      form.setValue("dueDate", dueDate.toISOString().split("T")[0]);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("startDate", e.target.value);
    
    // Recalculate due date if template has default duration
    if (selectedTemplate?.defaultDuration) {
      const startDate = new Date(e.target.value);
      const dueDate = addDays(startDate, selectedTemplate.defaultDuration);
      form.setValue("dueDate", dueDate.toISOString().split("T")[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project from Template</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Template selection sidebar */}
          {!templateId && (
            <div className="w-full md:w-1/3 border-r pr-4 space-y-4">
              <h3 className="font-semibold">Choose Template</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {projectTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates available</p>
                ) : (
                  projectTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
                          {template.description.substring(0, 50)}
                          {template.description.length > 50 ? "..." : ""}
                        </div>
                        <div className="mt-2 flex items-center text-xs text-muted-foreground">
                          <ListChecks className="h-3 w-3 mr-1" />
                          <span>{template.tasks.length} tasks</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Project creation form */}
          <div className={`w-full ${!templateId ? "md:w-2/3" : ""}`}>
            {selectedTemplate ? (
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
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
                    
                    <div className="space-y-2">
                      <Label>Assign Team Members</Label>
                      <Select value="" onValueChange={handleMemberSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team members" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem 
                              key={member.id} 
                              value={member.id}
                              disabled={selectedMembers.includes(member.id)}
                            >
                              {member.name} {selectedMembers.includes(member.id) ? "✓" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Show selected members as badges */}
                      {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedMembers.map((memberId) => {
                            const member = teamMembers.find(m => m.id === memberId);
                            return member ? (
                              <Badge key={memberId} variant="secondary" className="text-xs">
                                {member.name}
                                <button
                                  type="button"
                                  className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                                  onClick={() => removeMember(memberId)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
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
                            <Input 
                              type="date" 
                              {...field} 
                              onChange={handleStartDateChange}
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
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-6 bg-accent/30 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Template Preview</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="text-sm">{selectedTemplate.tasks.length} Tasks</span>
                      </div>
                      <div className="flex items-center">
                        <ListChecks className="h-4 w-4 mr-2" />
                        <span className="text-sm">
                          {selectedTemplate.tasks.reduce((total, task) => total + task.subtasks.length, 0)} Subtasks
                        </span>
                      </div>
                      {selectedTemplate.allocatedHours && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="text-sm">{selectedTemplate.allocatedHours} Hours Allocated</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Project</Button>
                  </DialogFooter>
                </form>
              </Form>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                {projectTemplates.length === 0 ? (
                  <>
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium mb-2">No Templates Available</p>
                    <p className="text-sm text-muted-foreground">
                      Create a template first to use it for new projects
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium mb-2">Select a Template</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a template from the sidebar to create a new project
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
