import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { Project } from "@/types";
import { Separator } from "@/components/ui/separator";
import { MessageSquare } from "lucide-react";

interface GoogleChatSettingsProps {
  project: Project;
}

interface NotificationSetting {
  enabled: boolean;
  message_template: string;
}

interface GoogleChatConfig {
  webhook_url: string | null;
  enabled: boolean;
  notifications: {
    task_created: NotificationSetting;
    task_completed: NotificationSetting;
    task_overdue: NotificationSetting;
    task_updated: NotificationSetting;
  };
}

const defaultConfig: GoogleChatConfig = {
  webhook_url: null,
  enabled: false,
  notifications: {
    task_created: {
      enabled: true,
      message_template: "🆕 New task created: {{task_title}} in project {{project_name}}"
    },
    task_completed: {
      enabled: true,
      message_template: "✅ Task completed: {{task_title}} in project {{project_name}}"
    },
    task_overdue: {
      enabled: true,
      message_template: "⚠️ Task overdue: {{task_title}} in project {{project_name}} (Due: {{due_date}})"
    },
    task_updated: {
      enabled: false,
      message_template: "📝 Task updated: {{task_title}} in project {{project_name}}"
    }
  }
};

const notificationTypes = [
  { key: 'task_created', label: 'Task Created', description: 'When a new task is created' },
  { key: 'task_completed', label: 'Task Completed', description: 'When a task is marked as complete' },
  { key: 'task_overdue', label: 'Task Overdue', description: 'When a task becomes overdue' },
  { key: 'task_updated', label: 'Task Updated', description: 'When a task is modified' }
];

export function GoogleChatSettings({ project }: GoogleChatSettingsProps) {
  const { updateProject } = useAppContext();
  const { toast } = useToast();
  
  const currentConfig = (project as any).google_chat_settings || defaultConfig;
  
  const [config, setConfig] = useState<GoogleChatConfig>(currentConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, {
        google_chat_settings: config
      } as any);
      
      toast({
        title: "Settings saved",
        description: "Google Chat notification settings have been updated."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = (checked: boolean) => {
    setConfig(prev => ({ ...prev, enabled: checked }));
  };

  const handleWebhookChange = (value: string) => {
    setConfig(prev => ({ ...prev, webhook_url: value || null }));
  };

  const handleNotificationToggle = (key: keyof GoogleChatConfig['notifications'], checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: {
          ...prev.notifications[key],
          enabled: checked
        }
      }
    }));
  };

  const handleTemplateChange = (key: keyof GoogleChatConfig['notifications'], value: string) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: {
          ...prev.notifications[key],
          message_template: value
        }
      }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <div>
            <CardTitle>Google Chat Notifications</CardTitle>
            <CardDescription>
              Configure Google Chat webhook notifications for this project
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled" className="text-base">Enable Google Chat</Label>
            <p className="text-sm text-muted-foreground">
              Send notifications to Google Chat for this project
            </p>
          </div>
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        <Separator />

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook">Webhook URL</Label>
          <Input
            id="webhook"
            type="url"
            placeholder="https://chat.googleapis.com/v1/spaces/..."
            value={config.webhook_url || ''}
            onChange={(e) => handleWebhookChange(e.target.value)}
            disabled={!config.enabled}
          />
          <p className="text-xs text-muted-foreground">
            Get your webhook URL from Google Chat → Space settings → Apps & integrations
          </p>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium">Notification Events</h3>
            <p className="text-sm text-muted-foreground">
              Choose which events trigger notifications and customize the messages
            </p>
          </div>

          {notificationTypes.map((type) => {
            const notifKey = type.key as keyof GoogleChatConfig['notifications'];
            const notif = config.notifications[notifKey];
            
            return (
              <div key={type.key} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${type.key}`} className="font-medium">
                        {type.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <Switch
                    id={`toggle-${type.key}`}
                    checked={notif.enabled}
                    onCheckedChange={(checked) => handleNotificationToggle(notifKey, checked)}
                    disabled={!config.enabled}
                  />
                </div>
                
                {notif.enabled && config.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor={`template-${type.key}`} className="text-sm">
                      Message Template
                    </Label>
                    <Textarea
                      id={`template-${type.key}`}
                      value={notif.message_template}
                      onChange={(e) => handleTemplateChange(notifKey, e.target.value)}
                      placeholder="Enter message template..."
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available variables: {'{'}{'{'} task_title {'}'}{'}'}, {'{'}{'{'} project_name {'}'}{'}'}, {'{'}{'{'} due_date {'}'}{'}'}, {'{'}{'{'} assignee {'}'}{'}'} 
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isSaving || !config.enabled || !config.webhook_url}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
