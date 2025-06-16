
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useState, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MentionDropdown } from "./MentionDropdown";
import { User } from "@/types"; 

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
  const [content, setContent] = useState("");
  
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSend = () => {
    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
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
      content,
      taskId: "", // Temporary placeholder for task ID
      commentId: "" // Temporary placeholder for comment ID
    });
    
    setRecipients([]);
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

  const calculateMentionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    // Simple positioning - just below the textarea
    return {
      top: 40, // Position below the textarea
      left: 0
    };
  };
  
  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    
    // Get cursor position
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Check for @ mentions
    if (cursorPos > 0) {
      const textBeforeCursor = text.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))) {
        const query = textBeforeCursor.substring(atIndex + 1);
        
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionOpen(true);
          setMentionPosition(calculateMentionPosition());
          return;
        }
      }
    }
    
    setMentionOpen(false);
  };
  
  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return;
    
    const text = content;
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find the position of the @ symbol before cursor
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Replace the @query with @username
      const newText = 
        beforeCursor.substring(0, atIndex) + 
        `@${user.name} ` + 
        afterCursor;
      
      setContent(newText);
      
      // Add the mentioned user to recipients if they're not already added
      if (!recipients.includes(user.id)) {
        setRecipients([...recipients, user.id]);
      }
      
      // Focus back on textarea and set cursor after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = atIndex + user.name.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
    
    setMentionOpen(false);
  };
  
  // Filter users (excluding current user)
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
          
          <div className="relative">
            <Label>Message</Label>
            <Textarea 
              ref={textareaRef}
              placeholder="Write your message here... Use @username to mention users"
              value={content}
              onChange={handleTextareaChange}
              rows={5}
            />
            
            {mentionOpen && (
              <div 
                className="absolute"
                style={{
                  top: mentionPosition.top,
                  left: mentionPosition.left,
                  zIndex: 1000
                }}
              >
                <MentionDropdown
                  users={otherUsers}
                  onSelect={handleSelectUser}
                  isOpen={mentionOpen}
                  searchQuery={mentionQuery}
                  className="shadow-lg border"
                />
              </div>
            )}
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
