
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { MentionDropdown } from "../messages/MentionDropdown";
import { getCaretCoordinates } from "@/utils/textUtils";
import { User } from "@/types";

interface ChannelMessageComposerProps {
  channelId: string;
  onSendMessage: (content: string, mentionedUsers: string[]) => void;
}

export function ChannelMessageComposer({
  channelId,
  onSendMessage,
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
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    
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
          
          if (textareaRef.current) {
            const cursorCoords = getCaretCoordinates(textareaRef.current, atIndex);
            setMentionPosition({
              top: cursorCoords.top - 200, // Position above the textarea
              left: cursorCoords.left
            });
          }
          
          return;
        }
      }
    }
    
    setMentionOpen(false);
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
  };

  const otherUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message... Use @username to mention someone"
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px]"
          />
          
          <MentionDropdown
            users={otherUsers}
            onSelect={handleSelectUser}
            isOpen={mentionOpen}
            position={mentionPosition}
            searchQuery={mentionQuery}
            className="absolute z-50"
          />
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
