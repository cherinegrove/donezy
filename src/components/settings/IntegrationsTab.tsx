
import { SlackIntegration } from "@/components/integrations/SlackIntegration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect with external services and applications
        </p>
      </div>
      <Separator />
      
      <SlackIntegration />
      
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>Connect with other services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["Email Notifications", "Calendar", "Google Drive", "Microsoft Teams"].map(integration => (
              <div key={integration} className="flex items-center justify-between p-3 border rounded-md">
                <span>{integration}</span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
