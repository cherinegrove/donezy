import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Building2, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [googleChatWebhook, setGoogleChatWebhook] = useState("");
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSyncingDeals, setIsSyncingDeals] = useState(false);
  const [isTestingChat, setIsTestingChat] = useState(false);

  const handleSaveGoogleChat = () => {
    localStorage.setItem("googleChatWebhook", googleChatWebhook);
    toast({
      title: "Google Chat webhook saved",
      description: "Your Google Chat integration is now configured.",
    });
  };

  const handleSaveHubSpot = () => {
    localStorage.setItem("hubspotApiKey", hubspotApiKey);
    toast({
      title: "HubSpot API key saved",
      description: "Your HubSpot integration is now configured.",
    });
  };

  const handleTestGoogleChat = async () => {
    const webhook = googleChatWebhook || localStorage.getItem("googleChatWebhook");
    
    if (!webhook) {
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
          webhookUrl: webhook,
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
    const apiKey = hubspotApiKey || localStorage.getItem("hubspotApiKey");
    
    if (!apiKey) {
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
        body: { hubspotApiKey: apiKey },
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
    const apiKey = hubspotApiKey || localStorage.getItem("hubspotApiKey");
    
    if (!apiKey) {
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
        body: { hubspotApiKey: apiKey },
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
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external tools and services to enhance your workflow.
        </p>
      </div>

      <Separator />

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
            <Button onClick={handleSaveHubSpot}>
              Save API Key
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
    </div>
  );
}