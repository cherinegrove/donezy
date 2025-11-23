import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your external service integrations</p>
      </div>
      <IntegrationsSettings />
    </div>
  );
}
