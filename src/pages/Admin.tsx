import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/AppContext";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminTeams from "@/components/admin/AdminTeams";
import { TaskStatusManager } from "@/components/admin/TaskStatusManager";
import { ProjectStatusManager } from "@/components/admin/ProjectStatusManager";
import { CustomFieldsManager } from "@/components/admin/CustomFieldsManager";
import { NativeFieldsManager } from "@/components/admin/NativeFieldsManager";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { DataImportManager } from "@/components/admin/DataImportManager";
import { Settings } from "lucide-react";
import Clients from "@/pages/Clients";
import { SystemPreferences } from "@/components/admin/SystemPreferences";
import { EmailTemplatesManager } from "@/components/admin/EmailTemplatesManager";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";

// Helper to check if user has admin system role
const hasAdminRole = (user: any) => {
  return user?.systemRoles?.includes('platform_admin') ||
         user?.systemRoles?.includes('support_admin');
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const { currentUser } = useAppContext();

  // Check admin access using systemRoles
  if (!hasAdminRole(currentUser)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to access the admin section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, teams, and monitor system activity</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto p-1">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="data-import">Data Import</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="account-settings">Account Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="data-import" className="space-y-6">
          <DataImportManager />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <SubscriptionManager />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Clients />
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <AdminTeams />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="account-settings" className="space-y-6">
          <div className="space-y-6">
            <div className="border rounded-lg">
              <div className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">Account Settings</h3>
                    <p className="text-sm text-muted-foreground">Manage custom fields and global system settings</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="space-y-6">
                  <TaskStatusManager />
                  <ProjectStatusManager />
                  <CustomFieldsManager />
                  <NativeFieldsManager />
                  <EmailTemplatesManager />
                  <SystemPreferences />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
