import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your external service integrations</p>
      </div>
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
    </div>
  );
}
