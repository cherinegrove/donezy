import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DefaultNotificationSettings() {
  const { toast } = useToast();
  const [defaultNotifications, setDefaultNotifications] = useState({
    emailNotifications: true,
    taskAssignments: true,
    projectUpdates: true,
    dueReminders: true,
    weeklyReports: false
  });

  const handleSaveNotificationSettings = () => {
    toast({
      title: "Notification Settings Saved",
      description: "Default notification settings have been updated successfully."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Default Notification Settings
        </CardTitle>
        <CardDescription>Configure default notification preferences for new users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Enable email notifications for new users by default</p>
            </div>
            <Switch
              checked={defaultNotifications.emailNotifications}
              onCheckedChange={(checked) => 
                setDefaultNotifications({ ...defaultNotifications, emailNotifications: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Task Assignments</Label>
              <p className="text-sm text-muted-foreground">Notify users when they are assigned to tasks</p>
            </div>
            <Switch
              checked={defaultNotifications.taskAssignments}
              onCheckedChange={(checked) => 
                setDefaultNotifications({ ...defaultNotifications, taskAssignments: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Project Updates</Label>
              <p className="text-sm text-muted-foreground">Notify users about project status changes</p>
            </div>
            <Switch
              checked={defaultNotifications.projectUpdates}
              onCheckedChange={(checked) => 
                setDefaultNotifications({ ...defaultNotifications, projectUpdates: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Due Date Reminders</Label>
              <p className="text-sm text-muted-foreground">Send reminders for upcoming due dates</p>
            </div>
            <Switch
              checked={defaultNotifications.dueReminders}
              onCheckedChange={(checked) => 
                setDefaultNotifications({ ...defaultNotifications, dueReminders: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Send weekly summary reports to users</p>
            </div>
            <Switch
              checked={defaultNotifications.weeklyReports}
              onCheckedChange={(checked) => 
                setDefaultNotifications({ ...defaultNotifications, weeklyReports: checked })
              }
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveNotificationSettings}>
            Save Notification Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}