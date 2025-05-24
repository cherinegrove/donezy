
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface ManagerNotificationSettingsProps {
  userId: string;
}

export function ManagerNotificationSettings({ userId }: ManagerNotificationSettingsProps) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  
  const user = getUserById(userId);
  
  const defaultManagerSettings = {
    inApp: {
      newClients: true,
      clientUpdated: true,
      newProjects: true,
      projectUpdated: true,
      newTasks: false,
      taskUpdated: false,
      newSubtasks: false,
      subtaskUpdated: false,
      newMentions: true,
      mentionUpdated: true
    },
    email: {
      newClients: true,
      clientUpdated: false,
      newProjects: true,
      projectUpdated: false,
      newTasks: false,
      taskUpdated: false,
      newSubtasks: false,
      subtaskUpdated: false,
      newMentions: true,
      mentionUpdated: false
    }
  };
  
  const [managerSettings, setManagerSettings] = useState(
    user?.notificationPreferences?.notificationSettings ? {
      inApp: {
        newClients: user.notificationPreferences.notificationSettings.clients?.new ?? true,
        clientUpdated: user.notificationPreferences.notificationSettings.clients?.updated ?? true,
        newProjects: user.notificationPreferences.notificationSettings.projects?.new ?? true,
        projectUpdated: user.notificationPreferences.notificationSettings.projects?.updated ?? true,
        newTasks: user.notificationPreferences.notificationSettings.tasks?.new ?? false,
        taskUpdated: user.notificationPreferences.notificationSettings.tasks?.updated ?? false,
        newSubtasks: user.notificationPreferences.notificationSettings.subtasks?.new ?? false,
        subtaskUpdated: user.notificationPreferences.notificationSettings.subtasks?.updated ?? false,
        newMentions: user.notificationPreferences.notificationSettings.mentions?.new ?? true,
        mentionUpdated: user.notificationPreferences.notificationSettings.mentions?.updated ?? true
      },
      email: defaultManagerSettings.email
    } : defaultManagerSettings
  );
  
  if (!user) {
    return null;
  }
  
  const handleManagerSettingChange = (type: 'inApp' | 'email', key: string) => {
    setManagerSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: !prev[type][key as keyof typeof prev.inApp]
      }
    }));
  };
  
  const handleSave = async () => {
    await updateUser(userId, {
      notificationPreferences: {
        ...user.notificationPreferences,
        notificationSettings: {
          clients: { 
            new: managerSettings.inApp.newClients, 
            updated: managerSettings.inApp.clientUpdated 
          },
          projects: { 
            new: managerSettings.inApp.newProjects, 
            updated: managerSettings.inApp.projectUpdated 
          },
          tasks: { 
            new: managerSettings.inApp.newTasks, 
            updated: managerSettings.inApp.taskUpdated 
          },
          subtasks: { 
            new: managerSettings.inApp.newSubtasks, 
            updated: managerSettings.inApp.subtaskUpdated 
          },
          mentions: { 
            new: managerSettings.inApp.newMentions, 
            updated: managerSettings.inApp.mentionUpdated 
          }
        }
      }
    });
    
    toast({
      title: "Success",
      description: "Manager notification preferences updated successfully"
    });
  };
  
  const managerNotificationTypes = [
    { key: 'newClients', label: 'New clients created' },
    { key: 'clientUpdated', label: 'Client information updated' },
    { key: 'newProjects', label: 'New projects created' },
    { key: 'projectUpdated', label: 'Project updates' },
    { key: 'newTasks', label: 'New tasks created' },
    { key: 'taskUpdated', label: 'Task updates' },
    { key: 'newSubtasks', label: 'New subtasks created' },
    { key: 'subtaskUpdated', label: 'Subtask updates' },
    { key: 'newMentions', label: 'New mentions' },
    { key: 'mentionUpdated', label: 'Mention updates' }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager Notification Settings</CardTitle>
        <CardDescription>
          Configure notifications for management activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="font-medium">Notification Type</div>
          <div className="font-medium text-center">In-App</div>
          <div className="font-medium text-center">Email</div>
        </div>
        
        <Separator />
        
        {managerNotificationTypes.map((type, index) => (
          <div key={type.key}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <Label className="text-sm">{type.label}</Label>
              <div className="flex justify-center">
                <Checkbox
                  checked={managerSettings.inApp[type.key as keyof typeof managerSettings.inApp]}
                  onCheckedChange={() => handleManagerSettingChange('inApp', type.key)}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={managerSettings.email[type.key as keyof typeof managerSettings.email]}
                  onCheckedChange={() => handleManagerSettingChange('email', type.key)}
                />
              </div>
            </div>
            {index < managerNotificationTypes.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
        
        <div className="pt-4">
          <Button onClick={handleSave}>Save Manager Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}
