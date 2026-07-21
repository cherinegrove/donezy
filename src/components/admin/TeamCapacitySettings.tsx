import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";

interface TeamCapacityThresholds {
  minimumHours: number;    // Green zone - bare minimum
  goodHours: number;       // Yellow zone - comfortable
  maxHours: number;        // Red zone - at capacity
}

const DEFAULT_THRESHOLDS: TeamCapacityThresholds = {
  minimumHours: 15,
  goodHours: 20,
  maxHours: 30,
};

export function TeamCapacitySettings() {
  const { toast } = useToast();
  const { currentUser } = useAppContext();
  const [thresholds, setThresholds] = useState<TeamCapacityThresholds>(DEFAULT_THRESHOLDS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser?.organizationId) return;
      const { data, error } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", currentUser.organizationId)
        .maybeSingle();

      if (error) {
        console.error("Error loading organization settings:", error);
        return;
      }
      const settings = (data?.settings as any) || {};
      if (settings.teamCapacity) {
        setThresholds(settings.teamCapacity);
      }
    };
    loadSettings();
  }, [currentUser?.organizationId]);

  const handleSaveSettings = async () => {
    if (!currentUser?.organizationId) {
      toast({
        title: "Error",
        description: "No organization found for your account.",
        variant: "destructive"
      });
      return;
    }

    // Validate values
    if (thresholds.minimumHours >= thresholds.goodHours || thresholds.goodHours >= thresholds.maxHours) {
      toast({
        title: "Invalid Settings",
        description: "Minimum hours must be less than good hours, which must be less than max hours.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", currentUser.organizationId)
        .maybeSingle();

      const merged = {
        ...((existing?.settings as any) || {}),
        teamCapacity: thresholds,
      };

      const { error } = await supabase
        .from("organizations")
        .update({ settings: merged })
        .eq("id", currentUser.organizationId);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Team capacity thresholds have been updated.",
      });
    } catch (error) {
      console.error("Error saving team capacity settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Team Capacity Settings
        </CardTitle>
        <CardDescription>
          Configure weekly billable hour thresholds for your team. These values determine the color coding in the Task Capacity view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Minimum Hours (Green) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Minimum Hours per Week (Green Zone)</Label>
              <span className="text-sm text-muted-foreground">Bare minimum required</span>
            </div>
            <Input
              type="number"
              min="0"
              max="40"
              value={thresholds.minimumHours}
              onChange={(e) => setThresholds({ ...thresholds, minimumHours: Number(e.target.value) })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Hours below this threshold will show as green (minimum acceptable)
            </p>
          </div>

          {/* Good Hours (Yellow) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Good Hours per Week (Yellow Zone)</Label>
              <span className="text-sm text-muted-foreground">Comfortable workload</span>
            </div>
            <Input
              type="number"
              min="0"
              max="40"
              value={thresholds.goodHours}
              onChange={(e) => setThresholds({ ...thresholds, goodHours: Number(e.target.value) })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Hours between minimum and this will show as yellow (good pace)
            </p>
          </div>

          {/* Max Hours (Red) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Maximum Hours per Week (Red Zone)</Label>
              <span className="text-sm text-muted-foreground">At capacity</span>
            </div>
            <Input
              type="number"
              min="0"
              max="60"
              value={thresholds.maxHours}
              onChange={(e) => setThresholds({ ...thresholds, maxHours: Number(e.target.value) })}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Hours above this threshold will show as red (at/over capacity)
            </p>
          </div>
        </div>

        {/* Visual Reference */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Threshold Reference:</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="h-3 bg-green-500 rounded w-full"></div>
              <p className="text-xs">0 - {thresholds.minimumHours}h</p>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-yellow-500 rounded w-full"></div>
              <p className="text-xs">{thresholds.minimumHours}h - {thresholds.goodHours}h</p>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-orange-500 rounded w-full"></div>
              <p className="text-xs">{thresholds.goodHours}h - {thresholds.maxHours}h</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-red-500 rounded w-full"></div>
            <p className="text-xs">{thresholds.maxHours}h+</p>
          </div>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Capacity Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
