import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskEmailSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export function TaskEmailSummaryDialog({
  open,
  onOpenChange,
  task,
}: TaskEmailSummaryDialogProps) {
  const { toast } = useToast();
  const [emailContent, setEmailContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      generateEmailContent();
      setCopied(false);
    }
  }, [open, task]);

  const generateEmailContent = () => {
    const checklist = (task.checklist || []) as ChecklistItem[];
    
    let content = `Task: ${task.title}\n\n`;
    
    if (task.description) {
      content += `Description:\n${task.description}\n\n`;
    }
    
    if (checklist.length > 0) {
      content += `Checklist Items:\n`;
      checklist.forEach((item) => {
        const statusIcon = item.completed ? "✓" : "○";
        content += `  • ${statusIcon} ${item.text}\n`;
      });
      
      const completedCount = checklist.filter(item => item.completed).length;
      content += `\nProgress: ${completedCount}/${checklist.length} items completed`;
    }
    
    setEmailContent(content);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Email content has been copied",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please select and copy manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Summary
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Review and edit the email content below, then copy it to send to your client.
          </p>
          <Textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={15}
            className="font-mono text-sm resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
