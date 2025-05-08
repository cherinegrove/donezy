
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanCustomizationCard } from "@/components/settings/KanbanCustomizationCard";
import { useAppContext } from "@/contexts/AppContext";
import { UsersManagementTab } from "@/components/settings/UsersManagementTab";
import { ManagerNotificationSettings } from "@/components/settings/ManagerNotificationSettings";
import { ProfileInformationCard } from "@/components/settings/ProfileInformationCard";
import { GeneralNotificationSettings } from "@/components/settings/GeneralNotificationSettings";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { Button } from "@/components/ui/button";
import { Plus, Palette } from "lucide-react";
import { EditTeamDialog } from "@/components/teams/EditTeamDialog";
import { CompanyThemeSettings } from "@/components/settings/CompanyThemeSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const { currentUser } = useAppContext();
  const isClient = currentUser?.role === 'client';
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and account preferences
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          <TabsTrigger value="account">Account Settings</TabsTrigger>
        </TabsList>
        
        {/* Profile Settings Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          {currentUser && (
            <ProfileInformationCard userId={currentUser.id} />
          )}
          
          {/* Notifications */}
          {currentUser?.role === 'manager' && (
            <ManagerNotificationSettings userId={currentUser.id} />
          )}
          
          {/* General Notification Settings for all users */}
          {currentUser && (
            <GeneralNotificationSettings userId={currentUser.id} />
          )}
          
          {/* Theme settings for individual user */}
          {currentUser && (
            <ThemeSettings userId={currentUser.id} />
          )}
        </TabsContent>
        
        {/* Account Settings Tab */}
        <TabsContent value="account" className="mt-6 space-y-6">
          {isAdminOrManager && (
            <UsersManagementTab />
          )}

          {!isClient && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Teams Management</CardTitle>
                  <CardDescription>
                    Manage teams and set member permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateTeamDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </CardHeader>
              <CardContent>
                {/* Team management would go here */}
                <p className="text-center py-12 text-muted-foreground">
                  Create a team to organize your team members
                </p>
              </CardContent>
            </Card>
          )}
          
          {isAdminOrManager && (
            <CompanyThemeSettings />
          )}
          
          <KanbanCustomizationCard />
        </TabsContent>
      </Tabs>
      
      {/* Create Team Dialog */}
      <EditTeamDialog 
        isOpen={isCreateTeamDialogOpen}
        onClose={() => setIsCreateTeamDialogOpen(false)}
      />
    </div>
  );
};

export default Settings;
