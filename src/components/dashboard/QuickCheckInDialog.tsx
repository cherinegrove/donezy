import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";

interface QuickCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCheckInDialog({ open, onOpenChange }: QuickCheckInDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    yesterday: "",
    today: "",
    blockers: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("check_ins").insert({
        auth_user_id: currentUser.auth_user_id,
        user_id: currentUser.id,
        today: formData.today,
        yesterday: formData.yesterday || null,
        blockers: formData.blockers || null,
      });

      if (error) throw error;

      toast({
        title: "Check-in submitted",
        description: "Your daily check-in has been recorded.",
      });

      setFormData({ yesterday: "", today: "", blockers: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting check-in:", error);
      toast({
        title: "Error",
        description: "Failed to submit check-in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Daily Check-in</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yesterday">What did you work on yesterday?</Label>
            <Textarea
              id="yesterday"
              placeholder="Optional - describe what you accomplished"
              value={formData.yesterday}
              onChange={(e) => setFormData({ ...formData, yesterday: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="today">What will you work on today? *</Label>
            <Textarea
              id="today"
              placeholder="Describe your plan for today"
              value={formData.today}
              onChange={(e) => setFormData({ ...formData, today: e.target.value })}
              className="min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockers">Any blockers or concerns?</Label>
            <Textarea
              id="blockers"
              placeholder="Optional - mention any obstacles"
              value={formData.blockers}
              onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
              className="min-h-[60px]"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.today}>
              {loading ? "Submitting..." : "Submit Check-in"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}