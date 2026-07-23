import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DealMapping {
  billableHourConversion: number;
}

export function HubSpotDealMapping() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mapping, setMapping] = useState<DealMapping>({
    billableHourConversion: 1000,
  });

  const webhookUrl = `https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/hubspot-deal-webhook`;

  useEffect(() => {
    loadMapping();
  }, []);

  const loadMapping = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('auth_user_id', user.id)
        .eq('integration_name', 'hubspot_deal_mapping')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.settings && typeof data.settings === 'object' && 'billableHourConversion' in data.settings) {
        const settingsData = data.settings as DealMapping;
        setMapping(settingsData);
      }
    } catch (error: any) {
      console.error("Error loading mapping:", error);
    }
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Webhook URL copied",
      description: "Paste this into your HubSpot deal automation webhook settings.",
    });
    setTimeout(() => setCopied(false), 2000);
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
        title: "Settings saved",
        description: "HubSpot deal mapping settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          Automatically create projects when deals close in HubSpot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <p className="text-xs text-muted-foreground mb-2">Copy this URL and paste it into your HubSpot deal automation webhook settings</p>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-muted rounded-md text-sm font-mono break-all">
              {webhookUrl}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyWebhook}
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Configuration</h4>

          <div className="space-y-2">
            <Label htmlFor="conversion">Deal Amount → Allocated Hours Conversion</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  id="conversion"
                  type="number"
                  placeholder="1000"
                  value={mapping.billableHourConversion}
                  onChange={(e) => setMapping(prev => ({ ...prev, billableHourConversion: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap pb-2">$ = 1 hour</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Default: $1000 = 1 hour. Adjust to match your billing rate.
            </p>
          </div>
        </div>

        <Separator />

        {/* Setup Instructions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Setup Instructions</h4>
          <ol className="space-y-3 text-sm list-decimal list-inside">
            <li className="space-y-1">
              <span className="font-medium">In HubSpot, create a workflow for closed deals:</span>
              <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                <li>Go to Automation → Workflows → Create workflow</li>
                <li>Trigger: Deal property changed → Deal stage → Is any of → Closed Won</li>
              </ul>
            </li>
            <li className="space-y-1">
              <span className="font-medium">Add a webhook action to the workflow:</span>
              <ul className="ml-6 mt-1 space-y-1 text-muted-foreground list-disc list-inside">
                <li>Add action → Webhook</li>
                <li>Paste the webhook URL above</li>
                <li>Method: POST</li>
              </ul>
            </li>
            <li>
              <span className="font-medium">When a deal moves to "Closed Won", a project will be automatically created in Donezy</span>
            </li>
          </ol>
        </div>

        <Separator />

        {/* Info boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">✅ HubSpot → Donezy</p>
            <p className="text-blue-800 dark:text-blue-300 text-xs">
              Deal closed → Project created with deal info as project details
            </p>
          </div>
          <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">📊 Auto-populated fields</p>
            <p className="text-green-800 dark:text-green-300 text-xs">
              Project name, due date, allocated hours, client (auto-created if needed)
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleSaveMapping} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
