
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
import { useState, useRef, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        
        if (query.length > 0 && !query.includes(' ')) {
          setMentionQuery(query);
          setMentionOpen(true);
          
          // Calculate mention dropdown position based on textarea and cursor
          if (textareaRef.current) {
            const cursorCoords = getCaretCoordinates(textareaRef.current, atIndex);
            setMentionPosition({
              top: cursorCoords.top + 20,  // Add some offset below the @
              left: cursorCoords.left
            });
          }
          
          return;
        }
      }
    }
    
    setMentionOpen(false);
  };
  
  // Get caret (cursor) coordinates in the textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    // Create a mirror div with same styling as textarea
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    // Copy styles from textarea to mirror div
    mirror.style.width = element.offsetWidth + 'px';
    mirror.style.padding = style.padding;
    mirror.style.border = style.border;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    
    document.body.appendChild(mirror);
    
    // Add text content up to the caret position
    const textBeforeCaret = element.value.substring(0, position);
    mirror.textContent = textBeforeCaret;
    
    // Add a span at the end to mark the position
    const caretSpan = document.createElement('span');
    caretSpan.textContent = '|';
    mirror.appendChild(caretSpan);
    
    const caretRect = caretSpan.getBoundingClientRect();
    const textareaRect = element.getBoundingClientRect();
    
    document.body.removeChild(mirror);
    
    return {
      top: caretRect.top - textareaRect.top + element.scrollTop,
      left: caretRect.left - textareaRect.left + element.scrollLeft
    };
  };
  
  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: { id: string; name: string }) => {
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
  
  // Filter users based on mention query (excluding current user)
  const filteredUsers = users
    .filter(user => user.id !== currentUser?.id)
    .filter(user => user.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  
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
            
            {/* Mention Dropdown */}
            {mentionOpen && filteredUsers.length > 0 && (
              <div 
                className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-md"
                style={{
                  top: `${mentionPosition.top}px`,
                  left: `${mentionPosition.left}px`,
                  minWidth: '200px'
                }}
              >
                <div className="rounded-md border shadow-md overflow-hidden">
                  <div className="p-1 bg-popover text-popover-foreground">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Mentions
                    </div>
                    <div className="overflow-hidden">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
