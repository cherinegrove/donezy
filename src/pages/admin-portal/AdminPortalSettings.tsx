
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminPortalSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Admin portal configuration</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mt-2 text-center max-w-md">
            Settings will include admin user management, notification configuration, integration settings (Stripe, Resend, HubSpot), and portal customization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
