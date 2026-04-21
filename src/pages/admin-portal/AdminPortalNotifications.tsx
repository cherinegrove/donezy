
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Construction } from "lucide-react";

export default function AdminPortalNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Automated and manual notification management</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mt-2 text-center max-w-md">
            The notification system will include automated triggers for payment failures, trial expiration, usage limits, and manual notification composer with email templates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
