
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { MentionDropdown } from "./MentionDropdown";

export interface MessageReplyFormProps {
  onCancel: () => void;
  onSend: () => void;
  users: User[];
  replyContent: string;
  setReplyContent: React.Dispatch<React.SetStateAction<string>>;
}

export function MessageReplyForm({ 
  onCancel, 
  onSend, 
  users, 
  replyContent, 
  setReplyContent 
}: MessageReplyFormProps) {
  // Ensure users is an array to prevent TypeScript errors
  const usersList = Array.isArray(users) ? users : [];
  
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track cursor position
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReplyContent(value);
    setCursorPosition(e.target.selectionStart || 0);
    
    // Check for mention symbol (@)
    const lastAtPos = value.lastIndexOf('@', e.target.selectionStart || 0);
    if (lastAtPos !== -1) {
      const textBetweenAtAndCursor = value.substring(
        lastAtPos + 1, 
        e.target.selectionStart || 0
      );
      
      // If there's no space in this text, it's a potential mention
      if (!textBetweenAtAndCursor.includes(' ') && textBetweenAtAndCursor.length <= 20) {
        setMentionStartPos(lastAtPos);
        setMentionQuery(textBetweenAtAndCursor);
        setShowMentions(true);
        return;
      }
    }
    
    // No @ found, or @ followed by space, hide mentions
    setShowMentions(false);
  };

  // When textarea loses focus, hide mentions dropdown after a short delay
  // This allows clicks on the mention dropdown to register
  const handleBlur = () => {
    setTimeout(() => {
      setShowMentions(false);
    }, 150);
  };

  // Get position for mention dropdown
  const getMentionDropdownPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const text = textarea.value.substring(0, mentionStartPos);
    
    // Create a temporary element to measure text dimensions
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = `${textarea.offsetWidth}px`;
    mirror.style.fontSize = window.getComputedStyle(textarea).fontSize;
    mirror.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
    mirror.style.padding = window.getComputedStyle(textarea).padding;
    mirror.textContent = text;
    
    document.body.appendChild(mirror);
    
    // Calculate cursor position
    const textBeforeCursor = document.createTextNode(text);
    mirror.appendChild(textBeforeCursor);
    const span = document.createElement('span');
    span.textContent = '|';
    mirror.appendChild(span);
    
    const coords = span.getBoundingClientRect();
    const textareaCoords = textarea.getBoundingClientRect();
    
    document.body.removeChild(mirror);
    
    return {
      top: coords.top - textareaCoords.top + 20, // add some extra pixels for better positioning
      left: coords.left - textareaCoords.left
    };
  };

  const handleSelectMention = (user: User) => {
    if (!textareaRef.current) return;
    
    const beforeMention = replyContent.substring(0, mentionStartPos);
    const afterMention = replyContent.substring(cursorPosition);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    
    setReplyContent(newContent);
    setShowMentions(false);
    
    // Focus back on textarea after selection
    textareaRef.current.focus();
    
    // Set cursor position after the inserted mention
    const newCursorPos = mentionStartPos + user.name.length + 2; // +2 for @ and space
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  };
  
  const filteredUsers = usersList.filter(
    user => user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Position dropdown
  useEffect(() => {
    if (showMentions && textareaRef.current) {
      const { top, left } = getMentionDropdownPosition();
      const dropdown = document.getElementById('mention-dropdown');
      if (dropdown) {
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
      }
    }
  }, [showMentions, mentionQuery, replyContent]);
  
  return (
    <div className="space-y-4 w-full">
      <div className="relative w-full">
        <Textarea
          ref={textareaRef}
          value={replyContent}
          onChange={handleTextareaChange}
          onBlur={handleBlur}
          placeholder="Write your reply..."
          className="min-h-[100px] resize-none p-3 w-full"
        />
        
        {showMentions && filteredUsers.length > 0 && (
          <MentionDropdown 
            users={filteredUsers} 
            onSelect={handleSelectMention}
            id="mention-dropdown"
            className="absolute z-50 w-[200px]"
            style={{
              position: 'absolute',
              zIndex: 50
            }}
          />
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSend}>Send Reply</Button>
      </div>
    </div>
  );
}
