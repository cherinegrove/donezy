
import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileInformationCard } from "./ProfileInformationCard";
import { GeneralNotificationSettings } from "./GeneralNotificationSettings";
import { ManagerNotificationSettings } from "./ManagerNotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileSettings() {
  const { currentUser } = useAppContext();
  
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
          <TabsTrigger value="manager">Manager Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <ProfileInformationCard userId={currentUser.id} />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <GeneralNotificationSettings userId={currentUser.id} />
        </TabsContent>
        
        <TabsContent value="manager" className="space-y-6">
          {(currentUser.role === 'admin' || currentUser.role === 'manager') ? (
            <ManagerNotificationSettings userId={currentUser.id} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Manager settings are only available for admin and manager roles.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
