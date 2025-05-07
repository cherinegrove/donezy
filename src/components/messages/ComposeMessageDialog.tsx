
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeMessageDialog({
  open,
  onOpenChange,
}: ComposeMessageDialogProps) {
  const { users, currentUser, sendMessage } = useAppContext();
  
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  
  const handleSend = () => {
    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }
    
    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    
    sendMessage({
      senderId: currentUser?.id || "",
      recipientIds: recipients,
      subject,
      content,
    });
    
    setRecipients([]);
    setSubject("");
    setContent("");
    onOpenChange(false);
  };
  
  const handleAddRecipient = (userId: string) => {
    if (!recipients.includes(userId)) {
      setRecipients([...recipients, userId]);
    }
  };
  
  const handleRemoveRecipient = (userId: string) => {
    setRecipients(recipients.filter(id => id !== userId));
  };
  
  const otherUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Select onValueChange={handleAddRecipient}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {otherUsers
                  .filter(user => !recipients.includes(user.id))
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recipients.map(recipientId => {
                  const user = users.find(u => u.id === recipientId);
                  return (
                    <Button
                      key={recipientId}
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => handleRemoveRecipient(recipientId)}
                    >
                      {user?.name} ✕
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
          
          <div>
            <Label>Subject</Label>
            <Input 
              placeholder="Message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div>
            <Label>Message</Label>
            <Textarea 
              placeholder="Write your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
