
import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { getCaretCoordinates } from "@/utils/textUtils";
import { CollaboratorSelect } from "./CollaboratorSelect";

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { tasks, users, currentUser, addComment } = useAppContext();
  const [comment, setComment] = useState("");
  
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;
    
    addComment(taskId, currentUser.id, comment);
    setComment("");
  };
  
  // Helper function to get first name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };
  
  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setComment(text);
    
    // Get cursor position
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Check for @ mentions
    if (cursorPos > 0) {
      const textBeforeCursor = text.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))) {
        const query = textBeforeCursor.substring(atIndex + 1);
        
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
    
    setMentionOpen(false);
  };
  
  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: { id: string; name: string; firstName?: string }) => {
    if (!textareaRef.current) return;
    
    const text = comment;
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
      
      setComment(newText);
      
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
  
  // Create a filtered list of users for the mention dropdown
  const filteredUsers = users.filter(user => {
    if (!mentionQuery) return true;
    
    const query = mentionQuery.toLowerCase();
    const userName = user.name.toLowerCase();
    const firstName = getFirstName(user.name).toLowerCase();
    
    return userName.includes(query) || firstName.includes(query);
  });
  
  return (
    <div className="space-y-4">
      {task.comments && task.comments.length > 0 ? (
        <div className="space-y-4">
          {task.comments.map(c => {
            const commentUser = users.find(u => u.id === c.userId);
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={commentUser?.avatar} />
                  <AvatarFallback>{commentUser?.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{commentUser?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="mt-1">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No comments yet
        </div>
      )}
      
      {currentUser && (
        <form onSubmit={handleSubmitComment} className="space-y-2 relative">
          <Textarea 
            ref={textareaRef}
            placeholder="Add a comment... (Use @ to mention users)" 
            value={comment}
            onChange={handleTextareaChange}
            className="min-h-[80px]"
          />
          
          {/* Mention dropdown */}
          {mentionOpen && filteredUsers.length > 0 && (
            <div 
              className="absolute z-50 bg-white dark:bg-gray-800 border rounded-md shadow-md"
              style={{
                top: `${mentionPosition.top}px`,
                left: `${mentionPosition.left}px`,
                minWidth: '200px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              <div className="rounded-md overflow-hidden">
                <div className="p-1 bg-popover text-popover-foreground">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {mentionQuery ? `Matching "${mentionQuery}"` : "Select a user"}
                  </div>
                  <div className="overflow-hidden max-h-[200px] overflow-y-auto">
                    {filteredUsers.map((user) => {
                      const firstName = getFirstName(user.name);
                      
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleSelectUser({...user, firstName})}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{firstName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button type="submit" disabled={!comment.trim()}>
              Post Comment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
