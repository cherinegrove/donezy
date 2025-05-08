
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanCustomizationCard } from "@/components/settings/KanbanCustomizationCard";
import { UserInviteForm } from "@/components/settings/UserInviteForm";
import { useAppContext } from "@/contexts/AppContext";
import { UsersManagementTab } from "@/components/settings/UsersManagementTab";
import { ManagerNotificationSettings } from "@/components/settings/ManagerNotificationSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { currentUser } = useAppContext();
  const isClient = currentUser?.role === 'client';
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdminOrManager && <TabsTrigger value="users">Users</TabsTrigger>}
          {!isClient && <TabsTrigger value="teams">Teams & Permissions</TabsTrigger>}
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile form would go here */}
              <p className="text-center py-12 text-muted-foreground">
                Profile settings coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6 space-y-6">
          {currentUser?.role === 'manager' && (
            <ManagerNotificationSettings userId={currentUser.id} />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Notification settings would go here */}
              <p className="text-center py-12 text-muted-foreground">
                General notification settings coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdminOrManager && (
          <TabsContent value="users" className="mt-6 space-y-6">
            <UsersManagementTab />
          </TabsContent>
        )}
        
        <TabsContent value="teams" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teams Management</CardTitle>
              <CardDescription>
                Manage teams and set member permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Team management would go here */}
              <p className="text-center py-12 text-muted-foreground">
                Team management settings coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <KanbanCustomizationCard />
          
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Customize the appearance of your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Theme settings would go here */}
              <p className="text-center py-12 text-muted-foreground">
                Theme settings coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
