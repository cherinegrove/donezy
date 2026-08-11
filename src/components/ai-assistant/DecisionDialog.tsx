import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { logDecision } from "@/utils/decisionLogger";
import { Loader2 } from "lucide-react";

interface DecisionDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (decision: any) => void;
  currentUserName?: string;
}

export default function DecisionDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess,
  currentUserName = "Team",
}: DecisionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [tradeoffs, setTradeoffs] = useState("");

  const handleSave = async () => {
    if (!title.trim() || !reasoning.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and reasoning",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const decision = await logDecision(
        projectId,
        title,
        reasoning,
        tradeoffs || "None documented",
        currentUserName
      );

      toast({
        title: "Decision saved",
        description: `"${title}" has been logged for ${projectName}`,
      });

      // Reset form
      setTitle("");
      setReasoning("");
      setTradeoffs("");
      onClose();

      onSuccess?.(decision);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save decision",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log a Decision</DialogTitle>
          <DialogDescription>
            Document this decision for {projectName}. Future team members will
            understand why you chose this approach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Decision Title *</label>
            <Input
              placeholder="e.g., Use React instead of Vue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              What decision are you documenting?
            </p>
          </div>

          {/* Reasoning */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reasoning *</label>
            <Textarea
              placeholder="Why did you make this choice? What factors influenced this decision?"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Explain the reasoning behind this decision
            </p>
          </div>

          {/* Tradeoffs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tradeoffs (Optional)</label>
            <Textarea
              placeholder="What did you give up? What are the downsides of this choice?"
              value={tradeoffs}
              onChange={(e) => setTradeoffs(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Document any tradeoffs or compromises made
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm space-y-1">
            <p className="font-medium">💡 Why document decisions?</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>New team members understand context</li>
              <li>Avoid repeating past mistakes</li>
              <li>Learn from successful decisions</li>
              <li>Build institutional knowledge</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !title.trim() || !reasoning.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Decision"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
