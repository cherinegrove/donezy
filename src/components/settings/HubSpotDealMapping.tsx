import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Zap, Check } from "lucide-react";

interface DealMapping {
  dealNameField: string;
  dealAmountField: string;
  dealCloseDate: boolean;
  dealOwnerField: string;
  billableHourConversion: number; // e.g., 1 = $1 per hour
  webhookStatus: 'registered' | 'pending' | 'error';
}

export function HubSpotDealMapping() {
  const { toast } = useToast();
  const [mapping, setMapping] = useState<DealMapping>({
    dealNameField: 'dealname',
    dealAmountField: 'amount',
    dealCloseDate: true,
    dealOwnerField: 'hubspot_owner_id',
    billableHourConversion: 1000, // $1000 = 1 hour by default
    webhookStatus: 'pending',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKeyAndLoadMapping();
  }, []);

  const checkApiKeyAndLoadMapping = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if API key is configured
      const { data: settingsData } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('auth_user_id', user.id)
        .eq('integration_name', 'hubspot')
        .single();

      if (settingsData?.settings && typeof settingsData.settings === 'object' && 'apiKey' in settingsData.settings) {
        setHasApiKey(true);
      }

      // Load mapping configuration
      const { data: mappingData } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('auth_user_id', user.id)
        .eq('integration_name', 'hubspot_deal_mapping')
        .single();

      if (mappingData?.settings && typeof mappingData.settings === 'object') {
        setMapping(prev => ({ ...prev, ...(mappingData.settings as Partial<DealMapping>) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveMapping = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          auth_user_id: user.id,
          integration_name: 'hubspot_deal_mapping',
          settings: mapping,
        }, {
          onConflict: 'auth_user_id,integration_name'
        });

      if (error) throw error;

      toast({
        title: "Deal mapping saved",
        description: "Your HubSpot deal mapping configuration has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving mapping",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!hasApiKey) {
      toast({
        title: "Error",
        description: "Please save your HubSpot API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-register-webhook', {
        body: { action: 'register' },
      });

      if (error) throw error;

      setMapping(prev => ({ ...prev, webhookStatus: 'registered' }));
      toast({
        title: "Webhook registered",
        description: "HubSpot webhook has been registered. Closed won deals will now automatically create projects.",
      });
    } catch (error: any) {
      setMapping(prev => ({ ...prev, webhookStatus: 'error' }));
      toast({
        title: "Error registering webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Deal → Project Automation
        </CardTitle>
        <CardDescription>
          Automatically create projects when deals move to Closed Won
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasApiKey && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
            ⚠️ Please configure your HubSpot API key first to enable deal automation.
          </div>
        )}

        {/* Webhook Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Webhook Status</h4>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              mapping.webhookStatus === 'registered' ? 'bg-green-500' :
              mapping.webhookStatus === 'error' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <span className="text-sm capitalize">{mapping.webhookStatus}</span>
          </div>
          {mapping.webhookStatus !== 'registered' && hasApiKey && (
            <Button
              onClick={handleRegisterWebhook}
              disabled={isRegistering}
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isRegistering ? "Registering..." : "Register Webhook"}
            </Button>
          )}
        </div>

        <Separator />

        {/* Field Mapping */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Field Mapping</h4>
          <p className="text-xs text-muted-foreground">
            Configure which HubSpot deal properties map to Donezy project fields
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dealName">Deal Name → Project Name</Label>
              <Input
                id="dealName"
                placeholder="dealname"
                value={mapping.dealNameField}
                onChange={(e) => setMapping(prev => ({ ...prev, dealNameField: e.target.value }))}
                disabled={!hasApiKey}
              />
              <p className="text-xs text-muted-foreground">HubSpot property: dealname</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealAmount">Deal Amount → Allocated Hours</Label>
              <div className="flex gap-2">
                <Input
                  id="dealAmount"
                  placeholder="amount"
                  value={mapping.dealAmountField}
                  onChange={(e) => setMapping(prev => ({ ...prev, dealAmountField: e.target.value }))}
                  disabled={!hasApiKey}
                />
                <Input
                  type="number"
                  placeholder="Conversion rate"
                  value={mapping.billableHourConversion}
                  onChange={(e) => setMapping(prev => ({ ...prev, billableHourConversion: parseInt(e.target.value) || 1 }))}
                  disabled={!hasApiKey}
                  className="w-32"
                />
                <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                  $ = 1h
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                HubSpot property: amount. Set conversion: e.g., 1000 = $1000 per hour
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealOwner">Deal Owner → Assignee</Label>
              <Input
                id="dealOwner"
                placeholder="hubspot_owner_id"
                value={mapping.dealOwnerField}
                onChange={(e) => setMapping(prev => ({ ...prev, dealOwnerField: e.target.value }))}
                disabled={!hasApiKey}
              />
              <p className="text-xs text-muted-foreground">Will match owner email to Donezy users</p>
            </div>

            <div className="space-y-2">
              <Label>Deal Close Date → Project Due Date</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="closeDateToggle"
                  checked={mapping.dealCloseDate}
                  onChange={(e) => setMapping(prev => ({ ...prev, dealCloseDate: e.target.checked }))}
                  disabled={!hasApiKey}
                  className="w-4 h-4"
                />
                <Label htmlFor="closeDateToggle" className="font-normal cursor-pointer">
                  Sync HubSpot close date as project due date
                </Label>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Info boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">✅ HubSpot → Donezy</p>
            <p className="text-blue-800 dark:text-blue-300 text-xs">
              When a deal closes, we create a project + auto-create client if needed
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">↩️ Donezy → HubSpot</p>
            <p className="text-green-800 dark:text-green-300 text-xs">
              Project updates sync back: status, hours spent, name, client name
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleSaveMapping} disabled={isSaving || !hasApiKey}>
            {isSaving ? "Saving..." : "Save Mapping"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
