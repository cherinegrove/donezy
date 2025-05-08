
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useRef, useState } from "react";
import { MentionDropdown } from "./MentionDropdown";
import { getCaretCoordinates } from "@/utils/textUtils";

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface MessageReplyFormProps {
  onCancel: () => void;
  onSend: () => void;
  users: User[];
  replyContent: string;
  setReplyContent: (content: string) => void;
}

export function MessageReplyForm({
  onCancel,
  onSend,
  users,
  replyContent,
  setReplyContent
}: MessageReplyFormProps) {
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setReplyContent(text);
    
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

  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return;
    
    const text = replyContent;
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
      
      setReplyContent(newText);
      
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

  return (
    <div className="p-4 border-t space-y-3 relative">
      <Textarea
        ref={textareaRef}
        placeholder="Type your reply... Use @username to mention users"
        value={replyContent}
        onChange={handleTextareaChange}
        rows={4}
      />
      
      <MentionDropdown 
        users={users}
        isOpen={mentionOpen}
        position={mentionPosition}
        onSelectUser={handleSelectUser}
        searchQuery={mentionQuery}
      />
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSend}>
          Send Reply
        </Button>
      </div>
    </div>
  );
}
