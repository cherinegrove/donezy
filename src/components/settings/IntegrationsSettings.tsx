import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HubSpotTicketMapping } from "./HubSpotTicketMapping";
import { Badge } from "@/components/ui/badge";

type IntegrationName = 'hubspot' | null;

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