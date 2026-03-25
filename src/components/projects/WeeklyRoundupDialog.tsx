import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, Edit3, CheckCircle2, Loader2, Activity } from "lucide-react";

interface RoundupStats {
  completedCount: number;
  inProgressCount: number;
  awaitingCount: number;
  projectHealth: "on-track" | "attention-needed" | "blocked";
  // backward compat
  backlogCount?: number;
  awaitingFeedbackCount?: number;
  completedThisWeek?: number;
  addedThisWeek?: number;
}

interface WeeklyRoundupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientEmail: string;
  clientName: string;
  roundupData: {
    subject: string;
    emailContent: string;
    emailHtml?: string;
    stats: RoundupStats;
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
  const [editedHtml, setEditedHtml] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (roundupData) {
      setEditedContent(roundupData.emailContent);
      setEditedHtml(roundupData.emailHtml ?? "");
    }
  }, [roundupData]);

  const handleCopyHtml = async () => {
    if (!editedHtml) return;
    setIsCopying(true);
    try {
      // Try rich copy (preserves formatting in Gmail/Outlook)
      if (typeof ClipboardItem !== "undefined") {
        const blob = new Blob([editedHtml], { type: "text/html" });
        const item = new ClipboardItem({ "text/html": blob });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(editedHtml);
      }
      toast({ title: "Copied!", description: "HTML email copied — paste directly into Gmail or Outlook." });
    } catch {
      await navigator.clipboard.writeText(editedHtml);
      toast({ title: "Copied!", description: "Email HTML copied to clipboard." });
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyText = async () => {
    if (!editedContent) return;
    await navigator.clipboard.writeText(editedContent);
    toast({ title: "Copied!", description: "Plain text copied to clipboard." });
  };

  if (!roundupData) return null;

  const { stats } = roundupData;
  const completedCount = stats.completedCount ?? stats.completedThisWeek ?? 0;
  const inProgressCount = stats.inProgressCount ?? 0;
  const awaitingCount = stats.awaitingCount ?? stats.awaitingFeedbackCount ?? 0;
  const health = stats.projectHealth ?? (awaitingCount >= 3 ? "blocked" : awaitingCount > 0 ? "attention-needed" : "on-track");

  const healthConfig = {
    "on-track": { label: "On Track", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    "attention-needed": { label: "Needs Attention", color: "bg-amber-100 text-amber-800 border-amber-200" },
    "blocked": { label: "Blocked", color: "bg-red-100 text-red-800 border-red-200" },
  };
  const healthStyle = healthConfig[health] ?? healthConfig["attention-needed"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="text-lg">Weekly Project Roundup</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">To: {clientName} ({clientEmail})</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground truncate max-w-xs">{roundupData.subject}</span>
          </div>
        </DialogHeader>

        {/* Stats row */}
        <div className="flex items-center gap-3 px-6 py-3 bg-muted/40 border-b flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-emerald-700">{completedCount}</span>
            <span className="text-muted-foreground">completed</span>
          </div>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1.5 text-sm">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-700">{inProgressCount}</span>
            <span className="text-muted-foreground">in progress</span>
          </div>
          <span className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold" style={{ color: awaitingCount > 0 ? "#f97316" : "#22c55e" }}>{awaitingCount}</span>
            <span className="text-muted-foreground">waiting on client</span>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className={healthStyle.color}>
              {health === "on-track" ? "🟢" : health === "blocked" ? "🔴" : "🟡"} {healthStyle.label}
            </Badge>
          </div>
        </div>

        {/* Tabs: Preview | Edit HTML | Edit Text */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="preview" className="flex flex-col h-full">
            <TabsList className="mx-6 mt-3 mb-0 w-fit">
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </TabsTrigger>
              <TabsTrigger value="edit-html" className="gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Edit HTML
              </TabsTrigger>
              <TabsTrigger value="edit-text" className="gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Edit Plain Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 min-h-0 m-0 overflow-hidden">
              <div className="h-full overflow-auto px-6 py-3">
                {editedHtml ? (
                  <iframe
                    srcDoc={editedHtml}
                    className="w-full rounded-lg border"
                    style={{ height: "460px" }}
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    No HTML preview available
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="edit-html" className="flex-1 min-h-0 m-0 overflow-hidden">
              <div className="h-full px-6 py-3 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Edit the HTML source below. Changes will reflect in the Preview tab.</p>
                <Textarea
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="flex-1 min-h-[400px] font-mono text-xs resize-none"
                  placeholder="HTML email content..."
                />
              </div>
            </TabsContent>

            <TabsContent value="edit-text" className="flex-1 min-h-0 m-0 overflow-hidden">
              <div className="h-full px-6 py-3 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Plain text version for quick copy-paste.</p>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 min-h-[400px] font-mono text-sm resize-none"
                  placeholder="Plain text email content..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handleCopyText}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
          <Button onClick={handleCopyHtml} disabled={isCopying || !editedHtml}>
            {isCopying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copy HTML (Gmail / Outlook)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
