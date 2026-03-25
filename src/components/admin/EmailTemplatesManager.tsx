import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'task_due_today' | 'task_reminder' | 'task_overdue' | 'task_assignment' | 'project_added' | 'task_collaborator' | 'mentioned' | 'awaiting_feedback';
  isActive: boolean;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'task_due_today',
    name: 'Task Due Today',
    subject: 'Task Due Today: {{task_title}}',
    content: `Hello {{user_name}},

Your task "{{task_title}}" is due today.

Project: {{project_name}}
Priority: {{priority}}
Due Date: {{due_date}}

Description:
{{task_description}}

Please complete this task today to stay on track.

Best regards,
{{company_name}} Team`,
    type: 'task_due_today',
    isActive: true
  },
  {
    id: 'task_reminder',
    name: 'Task Reminder',
    subject: 'Task Reminder: {{task_title}}',
    content: `Hello {{user_name}},

This is a reminder about your upcoming task:

Task: {{task_title}}
Project: {{project_name}}
Due Date: {{due_date}}
Priority: {{priority}}

Please make sure to complete this task on time.

Best regards,
{{company_name}} Team`,
    type: 'task_reminder',
    isActive: true
  },
  {
    id: 'task_overdue',
    name: 'Task Overdue',
    subject: 'Overdue Task: {{task_title}}',
    content: `Hello {{user_name}},

Your task "{{task_title}}" is now overdue.

Project: {{project_name}}
Priority: {{priority}}
Due Date: {{due_date}}

Description:
{{task_description}}

Please complete this task as soon as possible.

Best regards,
{{company_name}} Team`,
    type: 'task_overdue',
    isActive: true
  },
  {
    id: 'task_assignment',
    name: 'Task Assignment',
    subject: 'New Task Assigned: {{task_title}}',
    content: `Hello {{user_name}},

You have been assigned a new task:

Task: {{task_title}}
Project: {{project_name}}
Due Date: {{due_date}}
Priority: {{priority}}

Description:
{{task_description}}

Please log in to your dashboard to view full details and get started.

Best regards,
{{company_name}} Team`,
    type: 'task_assignment',
    isActive: true
  },
  {
    id: 'project_added',
    name: 'Added to Project',
    subject: 'You\'ve been added to project: {{project_name}}',
    content: `Hello {{user_name}},

You have been added to the project "{{project_name}}".

Project Description:
{{project_description}}

You can now:
- View project details
- Access project tasks
- Collaborate with team members
- Track project progress

Please log in to your dashboard to get started.

Best regards,
{{company_name}} Team`,
    type: 'project_added',
    isActive: true
  },
  {
    id: 'task_collaborator',
    name: 'Added as Task Collaborator',
    subject: 'You\'ve been added as collaborator: {{task_title}}',
    content: `Hello {{user_name}},

You have been added as a collaborator to the task "{{task_title}}".

Task Details:
Project: {{project_name}}
Due Date: {{due_date}}
Priority: {{priority}}

Description:
{{task_description}}

You can now collaborate and contribute to this task.

Best regards,
{{company_name}} Team`,
    type: 'task_collaborator',
    isActive: true
  },
  {
    id: 'mentioned',
    name: 'You\'ve been Mentioned',
    subject: 'You were mentioned in: {{context_title}}',
    content: `Hello {{user_name}},

You have been mentioned by {{mention_by}} in {{context_type}} "{{context_title}}".

Message:
{{mention_message}}

Project: {{project_name}}

Please log in to view the full conversation and respond.

Best regards,
{{company_name}} Team`,
    type: 'mentioned',
    isActive: true
  },
  {
    id: 'awaiting_feedback',
    name: 'Awaiting Feedback',
    subject: 'Following up on {{task_title}} – feedback needed',
    content: `Hi {{feedback_who}},

Quick check-in on {{task_title}}.

We're waiting on: {{feedback_what}}
From: {{feedback_who}}
Impact: {{feedback_why}}
Need by: {{feedback_when}}

Can you help us get this by {{feedback_when}}?

Thanks,
{{user_name}}`,
    type: 'awaiting_feedback',
    isActive: true
  }
];

export const EmailTemplatesManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load templates from database on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from('email_templates')
        .select('*');

      if (error) throw error;

      // Merge database templates with defaults
      const mergedTemplates = defaultTemplates.map(defaultTemplate => {
        const dbTemplate = data?.find(t => t.type === defaultTemplate.type);
        if (dbTemplate) {
          return {
            id: dbTemplate.id,
            name: dbTemplate.name,
            subject: dbTemplate.subject,
            content: dbTemplate.content,
            type: dbTemplate.type as EmailTemplate['type'],
            isActive: dbTemplate.is_active
          };
        }
        return defaultTemplate;
      });

      setTemplates(mergedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setIsSaving(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Error",
          description: "You must be logged in to save templates.",
          variant: "destructive"
        });
        return;
      }

      // Check if template exists in database
      const { data: existing } = await supabase
        .from('email_templates')
        .select('id')
        .eq('type', selectedTemplate.type)
        .maybeSingle();

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: selectedTemplate.name,
            subject: selectedTemplate.subject,
            content: selectedTemplate.content,
            is_active: selectedTemplate.isActive
          })
          .eq('type', selectedTemplate.type);

        if (error) throw error;
      } else {
        // Insert new template
        const { error } = await supabase
          .from('email_templates')
          .insert({
            auth_user_id: session.session.user.id,
            type: selectedTemplate.type,
            name: selectedTemplate.name,
            subject: selectedTemplate.subject,
            content: selectedTemplate.content,
            is_active: selectedTemplate.isActive
          });

        if (error) throw error;
      }

      // Update local state
      setTemplates(prev => 
        prev.map(t => t.type === selectedTemplate.type ? selectedTemplate : t)
      );
      
      setIsEditing(false);
      toast({
        title: "Template Saved",
        description: "Email template has been saved to the database."
      });

      // Reload to get the latest data
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      toast({
        title: "Error",
        description: "Please select a template and enter a test email address.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Replace template variables with sample data
      const sampleData: Record<string, string> = {
        user_name: "John Doe",
        task_title: "Sample Task",
        project_name: "Sample Project", 
        due_date: "Tomorrow",
        priority: "High",
        task_description: "This is a sample task description",
        company_name: "Your Company",
        update_details: "This is a sample project update",
        mention_by: "Jane Smith",
        context_type: "task comment",
        context_title: "Sample Task",
        mention_message: "Hey @john, can you check this out?",
        project_description: "This is a sample project for testing",
        // Awaiting feedback variables
        feedback_what: "Approval on the revised mockups",
        feedback_who: "Client / Design Lead",
        feedback_why: "Blocking development start",
        feedback_when: "Friday, March 28",
      };

      let processedSubject = selectedTemplate.subject;
      let processedContent = selectedTemplate.content;

      Object.entries(sampleData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      });

      // Call the edge function to send the test email
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          email: testEmail,
          subject: processedSubject,
          content: processedContent
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${testEmail} successfully.`
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'task_due_today': return 'bg-red-100 text-red-800';
      case 'task_reminder': return 'bg-yellow-100 text-yellow-800';
      case 'task_overdue': return 'bg-red-100 text-red-800';
      case 'task_assignment': return 'bg-blue-100 text-blue-800';
      case 'project_added': return 'bg-green-100 text-green-800';
      case 'task_collaborator': return 'bg-purple-100 text-purple-800';
      case 'mentioned': return 'bg-orange-100 text-orange-800';
      case 'awaiting_feedback': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading templates...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates List */}
          <div className="space-y-4">
            <h3 className="font-medium">Email Templates</h3>
            <div className="space-y-3">
              {templates.map((template) => (
                <div 
                  key={template.type} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate?.type === template.type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditing(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeBadgeColor(template.type)}>
                        {template.type.replace('_', ' ')}
                      </Badge>
                      {template.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.subject}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Template Editor */}
          <div className="space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {isEditing ? 'Edit' : 'Preview'}: {selectedTemplate.name}
                  </h3>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {isEditing && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveTemplate} disabled={isSaving}>
                          {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate,
                          name: e.target.value
                        })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-type">Template Type</Label>
                      <Select
                        value={selectedTemplate.type}
                        onValueChange={(value) => setSelectedTemplate({
                          ...selectedTemplate,
                          type: value as EmailTemplate['type']
                        })}
                        disabled={true}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task_due_today">Task Due Today</SelectItem>
                          <SelectItem value="task_reminder">Task Reminder</SelectItem>
                          <SelectItem value="task_overdue">Task Overdue</SelectItem>
                          <SelectItem value="task_assignment">Task Assignment</SelectItem>
                          <SelectItem value="project_added">Added to Project</SelectItem>
                          <SelectItem value="task_collaborator">Task Collaborator</SelectItem>
                          <SelectItem value="mentioned">Mentioned</SelectItem>
                          <SelectItem value="awaiting_feedback">Awaiting Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="template-active">Template Active</Label>
                        <p className="text-sm text-muted-foreground">
                          When disabled, this notification type won't be sent
                        </p>
                      </div>
                      <Switch
                        id="template-active"
                        checked={selectedTemplate.isActive}
                        onCheckedChange={(checked) => setSelectedTemplate({
                          ...selectedTemplate,
                          isActive: checked
                        })}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template-subject">Email Subject</Label>
                    <Input
                      id="template-subject"
                      value={selectedTemplate.subject}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        subject: e.target.value
                      })}
                      disabled={!isEditing}
                      placeholder="Enter email subject with {{variables}}"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-content">Email Content</Label>
                    <Textarea
                      id="template-content"
                      value={selectedTemplate.content}
                      onChange={(e) => setSelectedTemplate({
                        ...selectedTemplate,
                        content: e.target.value
                      })}
                      disabled={!isEditing}
                      rows={8}
                      placeholder="Enter email content with {{variables}}"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Send Test Email</h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter test email address"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        type="email"
                      />
                      <Button onClick={handleSendTestEmail} variant="outline" size="sm">
                        <Send className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                    </div>
                  </div>

                    <div className="bg-muted p-3 rounded text-sm">
                      <h4 className="font-medium mb-2">Available Variables:</h4>
                      {selectedTemplate.type === 'awaiting_feedback' ? (
                        <div className="text-muted-foreground space-y-1">
                          <p><code>{'{{user_name}}'}</code> — Your name (the sender)</p>
                          <p><code>{'{{task_title}}'}</code> — The task name</p>
                          <p><code>{'{{project_name}}'}</code> — Project the task belongs to</p>
                          <p><code>{'{{feedback_what}}'}</code> — What you're waiting on</p>
                          <p><code>{'{{feedback_who}}'}</code> — Who you need it from</p>
                          <p><code>{'{{feedback_why}}'}</code> — Why it matters / impact</p>
                          <p><code>{'{{feedback_when}}'}</code> — Date it's needed by</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground space-y-1">
                          <p><code>{'{{user_name}}'}</code> — Recipient's name</p>
                          <p><code>{'{{task_title}}'}</code> — Task title</p>
                          <p><code>{'{{project_name}}'}</code> — Project name</p>
                          <p><code>{'{{due_date}}'}</code> — Due date</p>
                          <p><code>{'{{priority}}'}</code> — Task priority</p>
                          <p><code>{'{{company_name}}'}</code> — Company name</p>
                          <p><code>{'{{mention_by}}'}</code> — Person who mentioned you</p>
                          <p><code>{'{{context_type}}'}</code> — Where you were mentioned (task/comment)</p>
                        </div>
                      )}
                    </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a template from the left to edit</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
