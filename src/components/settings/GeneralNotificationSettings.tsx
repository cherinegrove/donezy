
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface NotificationSettingsProps {
  userId: string;
}

export function GeneralNotificationSettings({ userId }: NotificationSettingsProps) {
  const { getUserById, updateUser } = useAppContext();
  const { toast } = useToast();
  
  const user = getUserById(userId);
  
  // Default notification preferences
  const defaultPreferences = {
    clients: {
      new: true,
      updated: true
    },
    projects: {
      new: true,
      updated: true
    },
    tasks: {
      new: true,
      updated: true
    },
    subtasks: {
      new: true,
      updated: false
    },
    mentions: {
      new: true,
      updated: false
    }
  };
  
  const [settings, setSettings] = useState(user?.notificationPreferences?.notification || defaultPreferences);
  
  if (!user) {
    return null;
  }
  
  const handleToggleSetting = (category: string, action: 'new' | 'updated') => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [action]: !prev[category as keyof typeof prev][action]
      }
    }));
  };
  
  const handleSave = () => {
    updateUser(userId, {
      notificationPreferences: {
        ...user.notificationPreferences,
        notification: settings
      }
    });
    
    toast({
      title: "Success",
      description: "Notification preferences saved successfully"
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure when and how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>New</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Clients</TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.clients.new} 
                  onCheckedChange={() => handleToggleSetting('clients', 'new')}
                />
              </TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.clients.updated} 
                  onCheckedChange={() => handleToggleSetting('clients', 'updated')}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Projects</TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.projects.new} 
                  onCheckedChange={() => handleToggleSetting('projects', 'new')}
                />
              </TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.projects.updated} 
                  onCheckedChange={() => handleToggleSetting('projects', 'updated')}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Tasks</TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.tasks.new} 
                  onCheckedChange={() => handleToggleSetting('tasks', 'new')}
                />
              </TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.tasks.updated} 
                  onCheckedChange={() => handleToggleSetting('tasks', 'updated')}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Subtasks</TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.subtasks.new} 
                  onCheckedChange={() => handleToggleSetting('subtasks', 'new')}
                />
              </TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.subtasks.updated} 
                  onCheckedChange={() => handleToggleSetting('subtasks', 'updated')}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mentions</TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.mentions.new} 
                  onCheckedChange={() => handleToggleSetting('mentions', 'new')}
                />
              </TableCell>
              <TableCell>
                <Checkbox 
                  checked={settings.mentions.updated} 
                  onCheckedChange={() => handleToggleSetting('mentions', 'updated')}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        
        <div>
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
