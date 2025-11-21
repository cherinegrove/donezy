import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";

export default function Settings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      <IntegrationsSettings />
    </div>
  );
}
