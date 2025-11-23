import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface WeeklyRoundupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientEmail: string;
  clientName: string;
  roundupData: {
    subject: string;
    emailContent: string;
    stats: {
      backlogCount: number;
      inProgressCount: number;
      awaitingFeedbackCount: number;
      completedThisWeek: number;
      addedThisWeek: number;
    };
  } | null;
}

export function WeeklyRoundupDialog({
  open,
  onOpenChange,
  projectId,
  clientEmail,
  clientName,
  roundupData,
}: WeeklyRoundupDialogProps) {
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState("");

  // Update edited content when roundup data changes
  useEffect(() => {
    if (roundupData) {
      setEditedContent(roundupData.emailContent);
    }
  }, [roundupData]);

  const handleCopy = async () => {
    if (!editedContent) return;

    try {
      await navigator.clipboard.writeText(editedContent);
      toast({
        title: "Copied!",
        description: "Email content copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!roundupData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Weekly Project Roundup</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p>To: {clientName} ({clientEmail})</p>
            <p>Subject: {roundupData.subject}</p>
          </div>
        </DialogHeader>

        {roundupData.stats && (
          <div className="grid grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{roundupData.stats.backlogCount}</div>
              <div className="text-xs text-muted-foreground">Backlog</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{roundupData.stats.inProgressCount}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{roundupData.stats.awaitingFeedbackCount}</div>
              <div className="text-xs text-muted-foreground">Awaiting Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{roundupData.stats.completedThisWeek}</div>
              <div className="text-xs text-muted-foreground">Completed This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{roundupData.stats.addedThisWeek}</div>
              <div className="text-xs text-muted-foreground">Added This Week</div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="text-sm text-muted-foreground mb-2">
            Edit the email content below before copying
          </div>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="flex-1 min-h-[300px] font-mono text-sm"
            placeholder="Email content..."
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
