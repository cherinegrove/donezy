import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your notification preferences
        </p>
      </div>
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
    </div>
  );
}
