
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/contexts/AppContext";
import { Send, AlertCircle } from "lucide-react";
import { MentionDropdown } from "./MentionDropdown";
import { User } from "@/types";

interface MessageReplyFormProps {
  commentId: string;
  taskId: string;
  projectId?: string;
  clientId?: string;
  onReplySent?: () => void;
}

export function MessageReplyForm({
  commentId,
  taskId,
  projectId,
  clientId,
  onReplySent,
}: MessageReplyFormProps) {
  const { sendMessage, currentUser, users } = useAppContext();
  const [content, setContent] = useState("");
  const [mentionDropdownOpen, setMentionDropdownOpen] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [lastCursorPosition, setLastCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Ensure we've imported the correct User type
  const filteredUsers = users.filter(user => {
    if (!mentionSearchQuery) return true;
    
    const query = mentionSearchQuery.toLowerCase();
    const name = user.name?.toLowerCase();
    const firstName = user.name?.split(' ')[0]?.toLowerCase();
    
    return name?.includes(query) || firstName?.includes(query);
  });

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    
    // Find if user is typing a mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    
    // Find the last @ symbol before cursor
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAtSymbol = textBeforeCursor.substring(lastAtSymbol + 1);
      
      // Check if the @ is preceded by a space or is at the beginning of the text
      const isValidMention = lastAtSymbol === 0 || 
                             textBeforeCursor[lastAtSymbol - 1] === ' ' || 
                             textBeforeCursor[lastAtSymbol - 1] === '\n';
                             
      // If there's no space in the mention query, it's a valid query
      const hasNoSpace = !textAfterAtSymbol.includes(' ');
      
      if (isValidMention && hasNoSpace) {
        setMentionSearchQuery(textAfterAtSymbol);
        setLastCursorPosition(lastAtSymbol);
        
        if (!mentionDropdownOpen) {
          setMentionDropdownOpen(true);
          calculateMentionDropdownPosition(lastAtSymbol);
        } else {
          // Update position if already open
          calculateMentionDropdownPosition(lastAtSymbol);
        }
        return;
      }
    }
    
    // If we're here, there's no valid @ mention being typed
    setMentionDropdownOpen(false);
  };
  
  const calculateMentionDropdownPosition = (atSymbolIndex: number) => {
    if (!textareaRef.current) return;
    
    // Create a temporary hidden div to calculate position
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordBreak = 'break-word';
    
    // Copy textarea styles to ensure exact text rendering
    const styles = window.getComputedStyle(textareaRef.current);
    tempDiv.style.width = styles.width;
    tempDiv.style.padding = styles.padding;
    tempDiv.style.fontFamily = styles.fontFamily;
    tempDiv.style.fontSize = styles.fontSize;
    tempDiv.style.lineHeight = styles.lineHeight;
    
    // Get text before the @ symbol
    const textBeforeAt = content.substring(0, atSymbolIndex);
    
    // Create text node for content before @ symbol
    const textNode = document.createTextNode(textBeforeAt);
    tempDiv.appendChild(textNode);
    
    // Add span for @ symbol
    const atSpan = document.createElement('span');
    atSpan.id = 'at-symbol';
    atSpan.textContent = '@';
    tempDiv.appendChild(atSpan);
    
    // Append to body temporarily
    document.body.appendChild(tempDiv);
    
    // Get position of @ symbol
    const atSymbolElem = tempDiv.querySelector('#at-symbol');
    if (atSymbolElem) {
      const rect = atSymbolElem.getBoundingClientRect();
      const textareaRect = textareaRef.current.getBoundingClientRect();
      
      // Calculate position relative to textarea
      const top = rect.bottom - textareaRect.top;
      const left = rect.left - textareaRect.left;
      
      setMentionPosition({ 
        top: top + 5, // Add some padding
        left: left
      });
    }
    
    // Remove the temporary div
    document.body.removeChild(tempDiv);
  };
  
  const handleSelectUser = useCallback((user: User) => {
    if (!textareaRef.current) return;
    
    // Replace the @searchQuery with @username
    const newContent = 
      content.substring(0, lastCursorPosition) + 
      `@${user.name.split(' ')[0]}` + // Just use first name
      content.substring(lastCursorPosition + mentionSearchQuery.length + 1); // +1 for the @ symbol
      
    setContent(newContent);
    setMentionDropdownOpen(false);
    
    // Focus back on textarea after selection
    textareaRef.current.focus();
  }, [content, lastCursorPosition, mentionSearchQuery]);
  
  const handleSendMessage = () => {
    if (!content.trim() || !currentUser) return;
    
    // Get all mentioned user IDs
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = Array.from(content.matchAll(mentionRegex)).map(match => match[1]);
    
    // Find user IDs from names (first name only for simplicity)
    const mentionedUserIds = users
      .filter(user => {
        const firstName = user.name.split(' ')[0];
        return mentionedNames.some(name => firstName === name);
      })
      .map(user => user.id);
    
    sendMessage({
      senderId: currentUser.id,
      recipientIds: mentionedUserIds,
      content,
      read: false,
      commentId,
      taskId,
      projectId,
      clientId,
    });
    
    setContent("");
    
    if (onReplySent) {
      onReplySent();
    }
  };
  
  useEffect(() => {
    // Close mention dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            className="w-full focus-visible:ring-1 focus-visible:ring-primary resize-none"
            placeholder="Type your reply... Use @ to mention users"
            rows={3}
          />
          {mentionDropdownOpen && (
            <MentionDropdown 
              users={filteredUsers}
              isOpen={mentionDropdownOpen}
              position={mentionPosition}
              onSelectUser={handleSelectUser}
              searchQuery={mentionSearchQuery}
            />
          )}
        </div>
        <Button
          onClick={handleSendMessage}
          className="mt-1"
          disabled={!content.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3 inline mr-1" />
        Mention users with @username
      </div>
    </div>
  );
}
