import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppContext } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Link as LinkIcon, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

const taskTemplateSchema = z.object({
  templateName: z.string().min(1, "Template name is required"),
  taskTitle: z.string().min(1, "Task title is required"),
  taskDescription: z.string().optional(),
});

type TaskTemplateFormData = z.infer<typeof taskTemplateSchema>;

interface CreateTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface LinkItem {
  id: string;
  name: string;
  url: string;
}

export function CreateTaskTemplateDialog({ open, onOpenChange, onTemplateCreated }: CreateTaskTemplateDialogProps) {
  const { currentUser } = useAppContext();
  const [session, setSession] = useState<any>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskTemplateFormData>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      templateName: "",
      taskTitle: "",
      taskDescription: "",
    },
  });

  // Get current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setChecklist([]);
      setLinks([]);
      setNewChecklistItem("");
      setLinkName("");
      setLinkUrl("");
      setActiveTab("details");
    }
  }, [open, form]);

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    setChecklist([
      ...checklist,
      {
        id: crypto.randomUUID(),
        text: newChecklistItem.trim(),
        completed: false,
      },
    ]);
    setNewChecklistItem("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    setLinks([
      ...links,
      {
        id: crypto.randomUUID(),
        name: linkName.trim(),
        url: formattedUrl,
      },
    ]);
    setLinkName("");
    setLinkUrl("");
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id));
  };

  const onSubmit = async (data: TaskTemplateFormData) => {
    if (!session?.user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to create templates",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('task_templates')
        .insert({
          name: data.templateName,
          description: data.templateName, // Use template name as description for backwards compatibility
          task_title: data.taskTitle,
          task_description: data.taskDescription || "",
          checklist: checklist as any,
          links: links as any,
          default_priority: "medium",
          default_status: "todo",
          auth_user_id: session.user.id,
        } as any);

      if (error) throw error;

      toast({
        title: "Template created",
        description: `${data.templateName} has been created successfully.`,
      });

      form.reset();
      setChecklist([]);
      setLinks([]);
      onOpenChange(false);
      onTemplateCreated?.();
    } catch (error) {
      console.error('Error creating task template:', error);
      toast({
        title: "Error",
        description: "Failed to create task template",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task Template</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Name */}
            <FormField
              control={form.control}
              name="templateName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bug Report, Feature Request" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4 grid grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <FormField
                  control={form.control}
                  name="taskTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter default task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter default task description" 
                          rows={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="checklist" className="space-y-4">
                <div className="space-y-4">
                  <Label>Checklist Items</Label>
                  
                  {/* Add new item */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add checklist item..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddChecklistItem}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Checklist items */}
                  {checklist.length > 0 ? (
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => handleToggleChecklistItem(item.id)}
                          />
                          <span
                            className={`flex-1 text-sm ${
                              item.completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.text}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveChecklistItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No checklist items yet. Add items that will be included when using this template.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-4">
                <div className="space-y-4">
                  <Label>Links</Label>
                  
                  {/* Add new link */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="linkName">Link Name</Label>
                        <Input
                          id="linkName"
                          placeholder="e.g., Design Document"
                          value={linkName}
                          onChange={(e) => setLinkName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkUrl">URL</Label>
                        <Input
                          id="linkUrl"
                          placeholder="https://..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddLink();
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddLink}
                        disabled={!linkName.trim() || !linkUrl.trim()}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Link
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Links list */}
                  {links.length > 0 ? (
                    <div className="space-y-2">
                      {links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                        >
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm truncate">{link.name}</span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No links yet. Add links that will be included when using this template.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
