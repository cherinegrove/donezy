
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const SlackIntegration = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState({
    projectCreated: true,
    taskStatusChanged: true,
    timeEntryAdded: false,
    commentAdded: false,
  });
  const { toast } = useToast();

  const handleConnect = () => {
    if (!webhookUrl.includes("hooks.slack.com")) {
      toast({
        title: "Invalid webhook URL",
        description: "Please enter a valid Slack webhook URL",
        variant: "destructive",
      });
      return;
    }

    // This would normally validate the webhook
    setIsConnected(true);
    toast({
      title: "Slack connected",
      description: "Slack integration has been successfully set up",
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWebhookUrl("");
    toast({
      title: "Slack disconnected",
      description: "Slack integration has been removed",
    });
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTestNotification = () => {
    // This would normally send a test notification to Slack
    toast({
      title: "Test notification sent",
      description: "Check your Slack channel for the test message",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slack Integration</CardTitle>
        <CardDescription>
          Connect to Slack to receive notifications about project and task updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook">Slack Webhook URL</Label>
              <Input
                id="webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-sm text-muted-foreground">
                You can find your webhook URL in the Slack app settings under
                Incoming Webhooks.
              </p>
            </div>
            <Button onClick={handleConnect} disabled={!webhookUrl}>
              Connect to Slack
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="connection-status" className="flex items-center">
                <div>
                  <p>Connection Status</p>
                  <p className="text-sm text-muted-foreground">
                    Webhook URL: {webhookUrl.substring(0, 30)}...
                  </p>
                </div>
              </Label>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Connected
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Notification Settings</h3>
              <div className="space-y-2">
                {Object.entries(notifications).map(([key, enabled]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between space-x-2"
                  >
                    <Label htmlFor={key} className="cursor-pointer">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </Label>
                    <Switch
                      id={key}
                      checked={enabled}
                      onCheckedChange={() =>
                        handleToggleNotification(key as keyof typeof notifications)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConnected ? (
          <>
            <Button variant="outline" onClick={handleTestNotification}>
              Send Test Notification
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
};
