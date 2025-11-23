import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Send } from "lucide-react";

interface WeeklyRoundupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientEmail: string;
  clientName: string;
  roundupData: {
    subject: string;
    htmlContent: string;
    textSummary: string;
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
  const [isSending, setIsSending] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");

  // Update edited summary when roundup data changes
  useState(() => {
    if (roundupData) {
      setEditedSummary(roundupData.textSummary);
    }
  });

  const handleCopyHtml = () => {
    if (roundupData) {
      navigator.clipboard.writeText(roundupData.htmlContent);
      toast({
        title: "Copied!",
        description: "Email HTML copied to clipboard",
      });
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(editedSummary);
    toast({
      title: "Copied!",
      description: "Summary text copied to clipboard",
    });
  };

  const handleSendEmail = async () => {
    if (!roundupData) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-weekly-roundup-email", {
        body: {
          to: clientEmail,
          subject: roundupData.subject,
          html: roundupData.htmlContent,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: `Weekly roundup sent to ${clientName} (${clientEmail})`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!roundupData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Weekly Project Roundup Preview</DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p>To: {clientName} ({clientEmail})</p>
            <p>Subject: {roundupData.subject}</p>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="text">Text Summary</TabsTrigger>
            <TabsTrigger value="html">HTML Code</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-[500px] border rounded-md">
              <div 
                className="p-4"
                dangerouslySetInnerHTML={{ __html: roundupData.htmlContent }}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Edit the text summary below and copy it for use in other tools
                </p>
                <Button variant="outline" size="sm" onClick={handleCopyText}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="html" className="mt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  HTML source code for the email
                </p>
                <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy HTML
                </Button>
              </div>
              <ScrollArea className="h-[500px]">
                <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                  <code>{roundupData.htmlContent}</code>
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSendEmail} disabled={isSending}>
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
