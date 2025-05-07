
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NotificationTimeframe, User } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ManagerNotificationSettingsProps {
  userId: string;
}

export function ManagerNotificationSettings({ userId }: ManagerNotificationSettingsProps) {
  const { getUserById, updateManagerNotificationPreferences } = useAppContext();
  const { toast } = useToast();
  
  const user = getUserById(userId);
  
  const [settings, setSettings] = useState<User['notificationPreferences']>(
    user?.notificationPreferences || {
      taskDue: ['same-day'],
      taskStatusChange: true,
      newComments: true,
      timeTracking: false
    }
  );
  
  if (!user) {
    return null;
  }
  
  const timeframes: { value: NotificationTimeframe; label: string }[] = [
    { value: 'same-day', label: 'Same day' },
    { value: '1-day', label: '1 day before' },
    { value: '3-days', label: '3 days before' },
    { value: '1-week', label: '1 week before' }
  ];
  
  const handleTimeframeChange = (timeframe: NotificationTimeframe) => {
    setSettings(prev => {
      const currentTimeframes = prev.taskDue || [];
      const newTimeframes = currentTimeframes.includes(timeframe)
        ? currentTimeframes.filter(t => t !== timeframe)
        : [...currentTimeframes, timeframe];
      
      return { ...prev, taskDue: newTimeframes };
    });
  };
  
  const handleToggleSetting = (key: keyof Omit<NonNullable<User['notificationPreferences']>, 'taskDue'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !(prev && prev[key])
    }));
  };
  
  const handleSave = () => {
    updateManagerNotificationPreferences(userId, settings);
    toast({ title: "Success", description: "Notification preferences saved successfully" });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Notification Preferences</CardTitle>
        <CardDescription>
          Configure when you want to be notified about tasks you manage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base">Task Due Date Warnings</Label>
          <p className="text-sm text-muted-foreground">
            Get notified when tasks are due
          </p>
          <div className="grid grid-cols-2 gap-2">
            {timeframes.map(timeframe => (
              <div key={timeframe.value} className="flex items-center space-x-2">
                <Checkbox
                  id={timeframe.value}
                  checked={settings?.taskDue?.includes(timeframe.value) || false}
                  onCheckedChange={() => handleTimeframeChange(timeframe.value)}
                />
                <Label htmlFor={timeframe.value} className="cursor-pointer">
                  {timeframe.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4 pt-4">
          <Label className="text-base">Other Notifications</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="task-status"
                checked={settings?.taskStatusChange || false}
                onCheckedChange={() => handleToggleSetting('taskStatusChange')}
              />
              <Label htmlFor="task-status" className="cursor-pointer">
                Task status changes
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-comments"
                checked={settings?.newComments || false}
                onCheckedChange={() => handleToggleSetting('newComments')}
              />
              <Label htmlFor="new-comments" className="cursor-pointer">
                New comments on tasks
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="time-tracking"
                checked={settings?.timeTracking || false}
                onCheckedChange={() => handleToggleSetting('timeTracking')}
              />
              <Label htmlFor="time-tracking" className="cursor-pointer">
                Time tracking anomalies (no time entries in 3+ days)
              </Label>
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
