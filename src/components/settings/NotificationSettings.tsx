import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type EventType =
  | "task_assigned"
  | "task_status_changed"
  | "task_updated"
  | "task_commented"
  | "mentioned";

const EVENT_TYPES: { value: EventType; label: string; description: string }[] = [
  { value: "task_assigned", label: "Assigned to me", description: "You're made the assignee on a task" },
  { value: "task_status_changed", label: "Status changes", description: "A task's status changes, including being marked done" },
  { value: "task_updated", label: "Task updates", description: "Any other field changes on a task" },
  { value: "task_commented", label: "New comments", description: "A new comment is posted on a task" },
  { value: "mentioned", label: "Mentions", description: "You're @mentioned in a comment" },
];

const DEFAULTS: Record<EventType, { in_app: boolean; email: boolean }> = {
  task_assigned: { in_app: true, email: true },
  task_status_changed: { in_app: true, email: false },
  task_updated: { in_app: true, email: false },
  task_commented: { in_app: true, email: false },
  mentioned: { in_app: true, email: true },
};

type Prefs = Record<EventType, { in_app: boolean; email: boolean }>;

export function NotificationSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("event_type, in_app, email")
        .eq("auth_user_id", user.id);

      if (error) throw error;

      const loaded = { ...DEFAULTS };
      for (const row of data || []) {
        loaded[row.event_type as EventType] = {
          in_app: row.in_app,
          email: row.email,
        };
      }
      setPrefs(loaded);
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (eventType: EventType, channel: "in_app" | "email") => {
    setPrefs((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], [channel]: !prev[eventType][channel] },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const rows = EVENT_TYPES.map(({ value }) => ({
        auth_user_id: user.id,
        event_type: value,
        in_app: prefs[value].in_app,
        email: prefs[value].email,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(rows, { onConflict: "auth_user_id,event_type" });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Choose how you want to hear about activity on your tasks. You're never notified about your own changes.
          Google Chat delivery is controlled per-project in Integrations, not here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="text-center w-24">In-app</TableHead>
              <TableHead className="text-center w-24">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EVENT_TYPES.map(({ value, label, description }) => (
              <TableRow key={value}>
                <TableCell>
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={prefs[value].in_app}
                    onCheckedChange={() => toggle(value, "in_app")}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={prefs[value].email}
                    onCheckedChange={() => toggle(value, "email")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
