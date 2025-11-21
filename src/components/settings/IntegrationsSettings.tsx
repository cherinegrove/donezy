import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Building2, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HubSpotTicketMapping } from "./HubSpotTicketMapping";

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [googleChatWebhook, setGoogleChatWebhook] = useState("");
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSyncingDeals, setIsSyncingDeals] = useState(false);
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [isSavingHubSpot, setIsSavingHubSpot] = useState(false);

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
        .in('integration_name', ['google_chat', 'hubspot'])
        .throwOnError();

      if (error) throw error;

      if (data) {
        const googleChat = data.find((d: any) => d.integration_name === 'google_chat');
        const hubspot = data.find((d: any) => d.integration_name === 'hubspot');

        if (googleChat?.settings && typeof googleChat.settings === 'object' && 'webhookUrl' in googleChat.settings) {
          setGoogleChatWebhook(googleChat.settings.webhookUrl as string);
        }
        if (hubspot?.settings && typeof hubspot.settings === 'object' && 'apiKey' in hubspot.settings) {
          setHubspotApiKey(hubspot.settings.apiKey as string);
        }
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSaveGoogleChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          auth_user_id: user.id,
          integration_name: 'google_chat',
          settings: { webhookUrl: googleChatWebhook }
        }, {
          onConflict: 'auth_user_id,integration_name'
        });

      if (error) throw error;

      toast({
        title: "Google Chat webhook saved",
        description: "Your Google Chat integration is now configured.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving webhook",
        description: error.message,
        variant: "destructive",
      });
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

  const handleTestGoogleChat = async () => {
    if (!googleChatWebhook) {
      toast({
        title: "Error",
        description: "Please save your Google Chat webhook first.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingChat(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-chat-send', {
        body: {
          webhookUrl: googleChatWebhook,
          message: "🎉 Test message from your project management system!\n\nYour Google Chat integration is working correctly.",
        },
      });

      if (error) throw error;

      toast({
        title: "Test message sent!",
        description: "Check your Google Chat space for the test message.",
      });
    } catch (error: any) {
      console.error("Error testing Google Chat:", error);
      toast({
        title: "Error sending test message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingChat(false);
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

  return (
    <div className="space-y-6">
      {/* Google Chat Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Google Chat
          </CardTitle>
          <CardDescription>
            Send task notifications and updates to Google Chat spaces. You'll need to create a webhook URL in Google Chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="googleChatWebhook">Google Chat Webhook URL</Label>
            <Input
              id="googleChatWebhook"
              type="url"
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              value={googleChatWebhook}
              onChange={(e) => setGoogleChatWebhook(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get this URL by creating an incoming webhook in your Google Chat space settings.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveGoogleChat}>
              Save Webhook
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestGoogleChat}
              disabled={isTestingChat}
            >
              <Send className="h-4 w-4 mr-2" />
              {isTestingChat ? "Sending..." : "Send Test Message"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HubSpot Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            HubSpot
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