import { NotificationSettings } from "@/components/settings/NotificationSettings";

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your notification preferences
        </p>
      </div>
      <NotificationSettings />
    </div>
  );
}
