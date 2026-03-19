import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, RefreshCw, ArrowLeft, CheckCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HubSpotTicketMapping } from "./HubSpotTicketMapping";
import { Badge } from "@/components/ui/badge";

type IntegrationName = 'hubspot' | 'google-chat' | null;

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationName>(null);
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSyncingDeals, setIsSyncingDeals] = useState(false);
  const [isSavingHubSpot, setIsSavingHubSpot] = useState(false);
  const [isHubSpotConfigured, setIsHubSpotConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_settings')
        .select('integration_name, settings')
        .eq('auth_user_id', user.id)
        .eq('integration_name', 'hubspot')
        .throwOnError();

      if (error) throw error;

      if (data && data.length > 0) {
        const hubspot = data[0];
        if (hubspot?.settings && typeof hubspot.settings === 'object' && 'apiKey' in hubspot.settings) {
          setHubspotApiKey(hubspot.settings.apiKey as string);
          setIsHubSpotConfigured(true);
        }
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSaveHubSpot = async () => {
    setIsSavingHubSpot(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          auth_user_id: user.id,
          integration_name: 'hubspot',
          settings: { apiKey: hubspotApiKey }
        }, {
          onConflict: 'auth_user_id,integration_name'
        });

      if (error) throw error;

      setIsHubSpotConfigured(true);
      toast({
        title: "HubSpot API key saved",
        description: "Your HubSpot integration is now configured.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingHubSpot(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!hubspotApiKey) {
      toast({
        title: "Error",
        description: "Please save your HubSpot API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingContacts(true);

    try {
      const { data, error } = await supabase.functions.invoke('hubspot-sync-contacts', {
        body: { hubspotApiKey },
      });

      if (error) throw error;

      toast({
        title: "Contacts synced successfully",
        description: `${data.synced} contacts synced from HubSpot.`,
      });
    } catch (error: any) {
      console.error("Error syncing contacts:", error);
      toast({
        title: "Error syncing contacts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleSyncDeals = async () => {
    if (!hubspotApiKey) {
      toast({
        title: "Error",
        description: "Please save your HubSpot API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingDeals(true);

    try {
      const { data, error } = await supabase.functions.invoke('hubspot-sync-deals', {
        body: { hubspotApiKey },
      });

      if (error) throw error;

      toast({
        title: "Deals synced successfully",
        description: `${data.synced} deals synced from HubSpot as projects.`,
      });
    } catch (error: any) {
      console.error("Error syncing deals:", error);
      toast({
        title: "Error syncing deals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncingDeals(false);
    }
  };

  // Integration list view
  const integrations = [
    {
      name: 'hubspot' as const,
      title: 'HubSpot',
      description: 'Sync contacts and deals from HubSpot',
      icon: Building2,
      configured: isHubSpotConfigured,
    },
    {
      name: 'google-chat' as const,
      title: 'Google Chat',
      description: 'Send project notifications to Google Chat spaces',
      icon: MessageSquare,
      configured: false, // Configured per-project
    },
  ];

  if (!selectedIntegration) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Integrations</h2>
          <p className="text-muted-foreground">Connect your favorite tools and services</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <Card
              key={integration.name}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
              onClick={() => setSelectedIntegration(integration.name)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <integration.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.title}</CardTitle>
                      {integration.configured && (
                        <Badge variant="outline" className="mt-1 text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{integration.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Google Chat integration detail view
  if (selectedIntegration === 'google-chat') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIntegration(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Google Chat
            </CardTitle>
            <CardDescription>
              Send project notifications and updates directly to Google Chat spaces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Per-Project Configuration
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Google Chat is configured individually for each project. This allows you to send notifications to different Google Chat spaces based on the project.
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">How It Works</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">✅ Part 1 — Outgoing (Simple)</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">Donezy → Google Chat via an <strong>Incoming Webhook URL</strong>. Set up per project.</p>
                </div>
                <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">⚙️ Part 2 — Incoming Replies (Requires Bot)</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Google Chat → Donezy requires a <strong>Google Chat App (Bot)</strong> configured in Google Cloud Console.</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Part 1: Send Notifications to Google Chat</h4>
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li className="space-y-1">
                  <span className="font-medium">Create an Incoming Webhook in Google Chat</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Open the Google Chat space → click the space name → <strong>Apps & integrations</strong></li>
                    <li>Click <strong>Add webhooks</strong>, give it a name, and copy the webhook URL</li>
                  </ul>
                </li>
                <li className="space-y-1">
                  <span className="font-medium">Paste the webhook URL in your Project Settings</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Go to the project → <strong>Google Chat Settings</strong> tab → paste the URL and enable notifications</li>
                  </ul>
                </li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Part 2: Receive Replies Back in Donezy (Bidirectional)</h4>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200 mb-3">
                ⚠️ A simple webhook URL is <strong>one-way only</strong>. To get replies from Google Chat back into Donezy as comments, you need to create a <strong>Google Chat App (Bot)</strong>.
              </div>
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li className="space-y-1">
                  <span className="font-medium">Enable the Google Chat API in Google Cloud Console</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.cloud.google.com</a> → <strong>APIs & Services</strong> → Enable <strong>Google Chat API</strong></li>
                  </ul>
                </li>
                <li className="space-y-1">
                  <span className="font-medium">Configure a Google Chat App</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Under <strong>Google Chat API → Configuration</strong>, create an App</li>
                    <li>Set the <strong>App URL</strong> (webhook endpoint) to:</li>
                  </ul>
                  <div className="ml-6 mt-2 rounded bg-muted px-3 py-2 font-mono text-xs break-all select-all">
                    https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/google-chat-webhook
                  </div>
                </li>
                <li className="space-y-1">
                  <span className="font-medium">Add the Bot to your Google Chat space</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>In your Chat space → <strong>Apps & integrations</strong> → add your new app</li>
                    <li>The bot will confirm it's connected to Donezy</li>
                  </ul>
                </li>
                <li className="space-y-1">
                  <span className="font-medium">Reply to task notifications in the thread</span>
                  <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                    <li>When Donezy sends a task notification, <strong>reply to that specific message thread</strong> (not a new message)</li>
                    <li>Your reply will appear as a comment on the task in Donezy automatically</li>
                  </ul>
                </li>
              </ol>
            </div>

            <Separator />

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
              <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">💡 Pro Tip</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You can configure different Google Chat spaces for different projects. Configure the <strong>same bot</strong> across all spaces — replies from any of them will route back to the correct Donezy task automatically.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => window.location.href = '/projects'}>
                Go to Projects
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://developers.google.com/chat/how-tos/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Webhook Docs
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://developers.google.com/chat/how-tos/apps-develop" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Google Chat App Docs
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // HubSpot integration detail view
  if (selectedIntegration === 'hubspot') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIntegration(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              HubSpot
              {isHubSpotConfigured && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sync contacts and deals from HubSpot. Contacts become clients, and deals become projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hubspotApiKey">HubSpot API Key</Label>
              <Input
                id="hubspotApiKey"
                type="password"
                placeholder="pat-na1-..."
                value={hubspotApiKey}
                onChange={(e) => setHubspotApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Generate a private app access token in your HubSpot account settings.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveHubSpot} disabled={isSavingHubSpot}>
                {isSavingHubSpot ? "Saving..." : "Save API Key"}
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sync Data</h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleSyncContacts}
                  disabled={isSyncingContacts}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                  {isSyncingContacts ? "Syncing..." : "Sync Contacts"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleSyncDeals}
                  disabled={isSyncingDeals}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingDeals ? 'animate-spin' : ''}`} />
                  {isSyncingDeals ? "Syncing..." : "Sync Deals"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click to manually sync data from HubSpot. You can also set up automatic syncing.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* HubSpot Ticket Automation */}
        <HubSpotTicketMapping />
      </div>
    );
  }

  return null;
}