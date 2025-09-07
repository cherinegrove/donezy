import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'task_assignment' | 'project_update' | 'due_reminder' | 'weekly_report' | 'welcome';
  isActive: boolean;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: '1',
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
    id: '2', 
    name: 'Project Update',
    subject: 'Project Update: {{project_name}}',
    content: `Hello {{user_name}},

There has been an update to project "{{project_name}}":

{{update_details}}

Please check your dashboard for more information.

Best regards,
{{company_name}} Team`,
    type: 'project_update',
    isActive: true
  },
  {
    id: '3',
    name: 'Task Due Reminder',
    subject: 'Task Due Soon: {{task_title}}',
    content: `Hello {{user_name}},

This is a reminder that your task "{{task_title}}" is due {{due_date}}.

Project: {{project_name}}
Priority: {{priority}}

Please complete this task as soon as possible.

Best regards,
{{company_name}} Team`,
    type: 'due_reminder',
    isActive: true
  },
  {
    id: '4',
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    content: `Hello {{user_name}},

Welcome to {{company_name}}! We're excited to have you on board.

Your account has been created and you can now:
- Access your dashboard
- View assigned tasks
- Collaborate with your team
- Track your progress

If you have any questions, please don't hesitate to reach out.

Best regards,
{{company_name}} Team`,
    type: 'welcome',
    isActive: true
  }
];

export const EmailTemplatesManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const { toast } = useToast();

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    // In a real implementation, you would save to database
    setTemplates(prev => 
      prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t)
    );
    
    setIsEditing(false);
    toast({
      title: "Template Saved",
      description: "Email template has been updated successfully."
    });
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
      const sampleData = {
        user_name: "John Doe",
        task_title: "Sample Task",
        project_name: "Sample Project", 
        due_date: "Tomorrow",
        priority: "High",
        task_description: "This is a sample task description",
        company_name: "Your Company",
        update_details: "This is a sample project update"
      };

      let processedSubject = selectedTemplate.subject;
      let processedContent = selectedTemplate.content;

      Object.entries(sampleData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      });

      // Use Supabase auth to send email
      const { error } = await supabase.auth.admin.inviteUserByEmail(testEmail, {
        data: {
          email_template: 'test',
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
      case 'task_assignment': return 'bg-blue-100 text-blue-800';
      case 'project_update': return 'bg-green-100 text-green-800';
      case 'due_reminder': return 'bg-orange-100 text-orange-800';
      case 'weekly_report': return 'bg-purple-100 text-purple-800';
      case 'welcome': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                  key={template.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
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
                        <Button size="sm" onClick={handleSaveTemplate}>
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
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task_assignment">Task Assignment</SelectItem>
                          <SelectItem value="project_update">Project Update</SelectItem>
                          <SelectItem value="due_reminder">Due Reminder</SelectItem>
                          <SelectItem value="weekly_report">Weekly Report</SelectItem>
                          <SelectItem value="welcome">Welcome</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <div className="text-muted-foreground space-y-1">
                      <p><code>{'{{user_name}}'}</code> - Recipient's name</p>
                      <p><code>{'{{task_title}}'}</code> - Task title</p>
                      <p><code>{'{{project_name}}'}</code> - Project name</p>
                      <p><code>{'{{due_date}}'}</code> - Due date</p>
                      <p><code>{'{{priority}}'}</code> - Task priority</p>
                      <p><code>{'{{company_name}}'}</code> - Company name</p>
                    </div>
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