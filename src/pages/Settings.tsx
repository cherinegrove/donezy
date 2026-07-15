import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your integrations and notification preferences</p>
      </div>
      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="integrations">
          <PermissionGuard
            resource="integrations"
            action="edit"
            fallback={
              <p className="text-muted-foreground text-sm">
                You don't have permission to manage integrations.
              </p>
            }
          >
            <IntegrationsSettings />
          </PermissionGuard>
        </TabsContent>
        <TabsContent value="notifications">
          <PermissionGuard
            resource="notifications"
            action="view"
            fallback={
              <p className="text-muted-foreground text-sm">
                You don't have permission to manage notification preferences.
              </p>
            }
          >
            <NotificationSettings />
          </PermissionGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
