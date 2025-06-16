import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { MentionDropdown } from "../messages/MentionDropdown";
import { User } from "@/types";

interface ChannelMessageComposerProps {
  channelId: string;
  onSendMessage: (content: string, mentionedUsers: string[]) => void;
  placeholder?: string;
}

export function ChannelMessageComposer({
  channelId,
  onSendMessage,
  placeholder = "Type a message... Use @username to mention someone",
}: ChannelMessageComposerProps) {
  const { users, currentUser } = useAppContext();
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim()) return;

    onSendMessage(content, mentionedUsers);
    setContent("");
    setMentionedUsers([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Close mentions on Escape
    if (e.key === 'Escape' && mentionOpen) {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const calculateMentionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Simple positioning - just below the textarea
    return {
      top: 40, // Position below the textarea
      left: 0
    };
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setContent(text);
    setCursorPosition(cursorPos);
    
    console.log("Text changed:", text);
    console.log("Cursor position:", cursorPos);
    
    // Check for @ mentions
    if (cursorPos > 0) {
      const textBeforeCursor = text.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      console.log("@ index:", atIndex);
      console.log("Text before cursor:", textBeforeCursor);
      
      if (atIndex !== -1) {
        // Check if @ is at start or preceded by whitespace
        const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
        const isValidMentionStart = atIndex === 0 || /\s/.test(charBeforeAt);
        
        if (isValidMentionStart) {
          const query = textBeforeCursor.substring(atIndex + 1);
          console.log("Mention query:", query);
          
          // Only show mentions if there's no space in the query (still typing the mention)
          if (!query.includes(' ') && query.length <= 20) {
            setMentionQuery(query);
            setMentionOpen(true);
            setMentionPosition(calculateMentionPosition());
            console.log("Setting mention open with query:", query);
            return;
          }
        }
      }
    }
    
    // Close mentions if not in a valid mention context
    if (mentionOpen) {
      console.log("Closing mentions");
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return;
    
    const text = content;
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newText = 
        beforeCursor.substring(0, atIndex) + 
        `@${user.name} ` + 
        afterCursor;
      
      setContent(newText);
      
      // Add user to mentioned users list
      if (!mentionedUsers.includes(user.id)) {
        setMentionedUsers([...mentionedUsers, user.id]);
      }
      
      // Focus and set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = atIndex + user.name.length + 2;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
    
    setMentionOpen(false);
    setMentionQuery("");
  };

  const otherUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px]"
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
        
        <Button onClick={handleSend} disabled={!content.trim()} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      {mentionedUsers.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Mentioning: {mentionedUsers.map(userId => {
            const user = users.find(u => u.id === userId);
            return user?.name;
          }).join(', ')}
        </div>
      )}
    </div>
  );
}
