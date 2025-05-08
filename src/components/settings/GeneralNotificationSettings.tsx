
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettingsProps {
  userId: string;
}

export function GeneralNotificationSettings({ userId }: NotificationSettingsProps) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  
  const user = getUserById(userId);
  
  // Default notification preferences if user doesn't have any set
  const defaultPreferences = {
    newClients: true,
    newTasks: true,
    subTasks: true,
    taskChanges: true,
    mentions: true
  };
  
  const [settings, setSettings] = useState(user?.generalNotificationPreferences || defaultPreferences);
  
  if (!user) {
    return null;
  }
  
  const handleToggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handleSave = () => {
    updateUser(userId, {
      generalNotificationPreferences: settings
    });
    
    toast({
      title: "Success",
      description: "Notification preferences saved successfully"
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Notification Settings</CardTitle>
        <CardDescription>
          Configure when and how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-clients"
              checked={settings.newClients}
              onCheckedChange={() => handleToggleSetting('newClients')}
            />
            <Label htmlFor="new-clients" className="cursor-pointer">
              New clients assigned to me
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-tasks"
              checked={settings.newTasks}
              onCheckedChange={() => handleToggleSetting('newTasks')}
            />
            <Label htmlFor="new-tasks" className="cursor-pointer">
              New tasks assigned to me
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sub-tasks"
              checked={settings.subTasks}
              onCheckedChange={() => handleToggleSetting('subTasks')}
            />
            <Label htmlFor="sub-tasks" className="cursor-pointer">
              New subtasks created
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="task-changes"
              checked={settings.taskChanges}
              onCheckedChange={() => handleToggleSetting('taskChanges')}
            />
            <Label htmlFor="task-changes" className="cursor-pointer">
              Changes to tasks I'm assigned to
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mentions"
              checked={settings.mentions}
              onCheckedChange={() => handleToggleSetting('mentions')}
            />
            <Label htmlFor="mentions" className="cursor-pointer">
              @mentions in comments and messages
            </Label>
          </div>
        </div>
        
        <div className="pt-4">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
