import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ApiKeysCard } from "@/components/settings/ApiKeysCard";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your notification preferences and API keys
        </p>
      </div>
      <NotificationSettings />
      <div className="mt-6">
        <ApiKeysCard />
      </div>
    </div>
  );
}
