
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useRef, useState, useEffect } from "react";
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
  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Debug - log users when component mounts
  useEffect(() => {
    console.log("MessageReplyForm users:", safeUsers);
  }, [safeUsers]);
  
  // Helper function to get first name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };

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
        
        // Always show dropdown after typing @ (even with empty query)
        // and limit results once the user types at least 1 character
        setMentionQuery(query);
        setMentionOpen(true);
        
        // Calculate mention dropdown position based on textarea and cursor
        if (textareaRef.current) {
          const cursorCoords = getCaretCoordinates(textareaRef.current, atIndex);
          console.log("Cursor coords:", cursorCoords);
          
          setMentionPosition({
            top: cursorCoords.top + 20,  // Add some offset below the @
            left: cursorCoords.left
          });
        }
        
        return;
      }
    }
    
    setMentionOpen(false);
  };

  // Listen for clicks outside to close the dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionOpen && textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mentionOpen]);

  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: User & { firstName?: string }) => {
    if (!textareaRef.current) return;
    
    const text = replyContent;
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find the position of the @ symbol before cursor
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Get the first name to use in the mention
      const firstName = user.firstName || getFirstName(user.name);
      
      // Replace the @query with @firstname
      const newText = 
        beforeCursor.substring(0, atIndex) + 
        `@${firstName} ` + 
        afterCursor;
      
      setReplyContent(newText);
      
      // Focus back on textarea and set cursor after the inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = atIndex + firstName.length + 2; // +2 for @ and space
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
        placeholder="Type your reply... Use @ to mention someone"
        value={replyContent}
        onChange={handleTextareaChange}
        rows={4}
      />
      
      <div className="relative">
        <MentionDropdown 
          users={safeUsers}
          isOpen={mentionOpen}
          position={mentionPosition}
          onSelectUser={handleSelectUser}
          searchQuery={mentionQuery}
        />
      </div>
      
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
