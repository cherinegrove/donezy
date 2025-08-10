
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileInformationCard } from "./ProfileInformationCard";
import { GeneralNotificationSettings } from "./GeneralNotificationSettings";
import { ManagerNotificationSettings } from "./ManagerNotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileSettings() {
  const { currentUser, customRoles } = useAppContext();
  
  if (!currentUser) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Please log in to access profile settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin' && (
            <TabsTrigger value="manager">Manager Settings</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <ProfileInformationCard userId={currentUser.id} />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
            <p className="text-muted-foreground mb-6">
              Configure how you want to receive notifications for different events. You can choose to receive notifications in the app, via email, or both.
            </p>
          </div>
          <GeneralNotificationSettings userId={currentUser.id} />
        </TabsContent>
        
        {customRoles.find(r => r.id === currentUser.roleId)?.name === 'Admin' && (
          <TabsContent value="manager" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Manager Notification Settings</h3>
              <p className="text-muted-foreground mb-6">
                Configure notifications for management activities such as client updates, project changes, and team activities.
              </p>
            </div>
            <ManagerNotificationSettings userId={currentUser.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
