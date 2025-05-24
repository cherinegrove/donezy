
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";

interface NotificationPreferencesCardProps {
  userId: string;
}

export function NotificationPreferencesCard({ userId }: NotificationPreferencesCardProps) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  
  const user = getUserById(userId);
  
  const defaultPreferences = {
    inApp: {
      newTasks: true,
      taskUpdates: true,
      newComments: true,
      mentions: true,
      projectUpdates: false,
      timeTracking: false
    },
    email: {
      newTasks: false,
      taskUpdates: false,
      newComments: true,
      mentions: true,
      projectUpdates: false,
      timeTracking: false
    }
  };
  
  const [preferences, setPreferences] = useState(
    user?.notificationPreferences?.detailedSettings || defaultPreferences
  );
  
  if (!user) {
    return null;
  }
  
  const handlePreferenceChange = (type: 'inApp' | 'email', key: string) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: !prev[type][key as keyof typeof prev.inApp]
      }
    }));
  };
  
  const handleSave = () => {
    updateUser(userId, {
      notificationPreferences: {
        ...user.notificationPreferences,
        detailedSettings: preferences
      }
    });
    
    toast({
      title: "Success",
      description: "Notification preferences updated successfully"
    });
  };
  
  const notificationTypes = [
    { key: 'newTasks', label: 'New tasks assigned to me' },
    { key: 'taskUpdates', label: 'Task status changes' },
    { key: 'newComments', label: 'New comments on my tasks' },
    { key: 'mentions', label: 'When I am mentioned' },
    { key: 'projectUpdates', label: 'Project updates' },
    { key: 'timeTracking', label: 'Time tracking reminders' }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about different events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="font-medium">Notification Type</div>
          <div className="font-medium text-center">In-App</div>
          <div className="font-medium text-center">Email</div>
        </div>
        
        <Separator />
        
        {notificationTypes.map((type, index) => (
          <div key={type.key}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <Label className="text-sm">{type.label}</Label>
              <div className="flex justify-center">
                <Checkbox
                  checked={preferences.inApp[type.key as keyof typeof preferences.inApp]}
                  onCheckedChange={() => handlePreferenceChange('inApp', type.key)}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={preferences.email[type.key as keyof typeof preferences.email]}
                  onCheckedChange={() => handlePreferenceChange('email', type.key)}
                />
              </div>
            </div>
            {index < notificationTypes.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
        
        <div className="pt-4">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
