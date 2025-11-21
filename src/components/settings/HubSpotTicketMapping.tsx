import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FieldMapping {
  hubspotField: string;
  taskField: string;
}

const HUBSPOT_TICKET_FIELDS = [
  { value: 'subject', label: 'Subject' },
  { value: 'content', label: 'Content/Description' },
  { value: 'hs_ticket_priority', label: 'Priority' },
  { value: 'hs_pipeline_stage', label: 'Pipeline Stage' },
  { value: 'createdate', label: 'Create Date' },
];

const TASK_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'due_date', label: 'Due Date' },
];

export function HubSpotTicketMapping() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { hubspotField: 'subject', taskField: 'title' },
    { hubspotField: 'content', taskField: 'description' },
    { hubspotField: 'hs_ticket_priority', taskField: 'priority' },
  ]);

  const webhookUrl = `https://puwxkygdlclcbyxrtppd.supabase.co/functions/v1/hubspot-ticket-webhook`;

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('auth_user_id', user.id)
        .eq('integration_name', 'hubspot_ticket_mapping')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.settings && typeof data.settings === 'object' && 'mappings' in data.settings) {
        const settingsData = data.settings as unknown as { mappings: FieldMapping[] };
        setMappings(settingsData.mappings);
      }
    } catch (error: any) {
      console.error("Error loading mappings:", error);
    }
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Webhook URL copied",
      description: "Use this URL in your HubSpot webhook settings.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMappings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          auth_user_id: user.id,
          integration_name: 'hubspot_ticket_mapping',
          settings: { mappings } as any
        }, {
          onConflict: 'auth_user_id,integration_name'
        });

      if (error) throw error;

      toast({
        title: "Mappings saved",
        description: "HubSpot ticket field mappings have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving mappings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateMapping = (index: number, field: 'hubspotField' | 'taskField', value: string) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const addMapping = () => {
    setMappings([...mappings, { hubspotField: '', taskField: '' }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>HubSpot Ticket Automation</CardTitle>
        <CardDescription>
          Automatically create tasks from HubSpot tickets by mapping ticket properties to task fields.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>Webhook URL</Label>
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
          <p className="text-xs text-muted-foreground">
            Configure this URL as a webhook in HubSpot for the "Ticket Created" event.
          </p>
        </div>

        {/* Field Mappings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Field Mappings</Label>
            <Button variant="outline" size="sm" onClick={addMapping}>
              Add Mapping
            </Button>
          </div>

          <div className="space-y-3">
            {mappings.map((mapping, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select
                    value={mapping.hubspotField}
                    onValueChange={(value) => updateMapping(index, 'hubspotField', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select HubSpot field" />
                    </SelectTrigger>
                    <SelectContent>
                      {HUBSPOT_TICKET_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex-1">
                  <Select
                    value={mapping.taskField}
                    onValueChange={(value) => updateMapping(index, 'taskField', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task field" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMapping(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSaveMappings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Mappings"}
        </Button>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Setup Instructions</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Copy the webhook URL above</li>
            <li>Go to HubSpot Settings → Integrations → Private Apps</li>
            <li>Create or edit your private app and add webhook subscriptions</li>
            <li>Subscribe to "Ticket Created" events</li>
            <li>Paste the webhook URL and save</li>
            <li>Configure your field mappings above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
