
import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { getCaretCoordinates } from "@/utils/textUtils";
import { CollaboratorSelect } from "./CollaboratorSelect";
import { useToast } from "@/hooks/use-toast";

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { tasks, users, currentUser, addComment, createMessage } = useAppContext();
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  
  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Ensure we have valid users array
  const safeUsers = Array.isArray(users) ? users : [];
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;
    
    // Extract mentioned users from the comment
    const mentionRegex = /@(\w+)/g;
    const mentionMatches = [...comment.matchAll(mentionRegex)];
    
    // Find user IDs for mentioned users
    const mentionedUserIds: string[] = [];
    mentionMatches.forEach(match => {
      const firstName = match[1];
      const mentionedUser = safeUsers.find(u => 
        u.name.toLowerCase().startsWith(firstName.toLowerCase())
      );
      
      if (mentionedUser && !mentionedUserIds.includes(mentionedUser.id)) {
        mentionedUserIds.push(mentionedUser.id);
      }
    });
    
    // Add the comment to the task
    const commentId = addComment(taskId, currentUser.id, comment, mentionedUserIds);
    
    // Create notification messages for each mentioned user and task assignee/collaborators
    if (task) {
      // For mentions
      mentionedUserIds.forEach(userId => {
        if (userId !== currentUser.id) {
          createMessage({
            senderId: currentUser.id,
            recipientIds: [userId],
            content: `You were mentioned in a comment on task "${task.title}"`,
            timestamp: new Date().toISOString(),
            read: false,
            commentId: commentId,
            taskId: taskId,
            projectId: task.projectId
          });
        }
      });
      
      // For task assignee
      if (task.assigneeId && task.assigneeId !== currentUser.id && !mentionedUserIds.includes(task.assigneeId)) {
        createMessage({
          senderId: currentUser.id,
          recipientIds: [task.assigneeId],
          content: `New comment on task "${task.title}" you're assigned to`,
          timestamp: new Date().toISOString(),
          read: false,
          commentId: commentId,
          taskId: taskId,
          projectId: task.projectId
        });
      }
      
      // For collaborators
      if (task.collaboratorIds && task.collaboratorIds.length > 0) {
        task.collaboratorIds.forEach(collaboratorId => {
          if (
            collaboratorId !== currentUser.id && 
            collaboratorId !== task.assigneeId && 
            !mentionedUserIds.includes(collaboratorId)
          ) {
            createMessage({
              senderId: currentUser.id,
              recipientIds: [collaboratorId],
              content: `New comment on task "${task.title}" you're collaborating on`,
              timestamp: new Date().toISOString(),
              read: false,
              commentId: commentId,
              taskId: taskId,
              projectId: task.projectId
            });
          }
        });
      }
    }
    
    toast({
      title: "Comment Added",
      description: mentionedUserIds.length > 0 
        ? "Your comment was added and mentioned users were notified" 
        : "Your comment was added",
    });
    
    // Reset comment input
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
        
        // Always show dropdown after typing @ (even with empty query)
        setMentionQuery(query);
        setMentionOpen(true);
        
        // Calculate mention dropdown position based on textarea and cursor
        if (textareaRef.current) {
          const cursorCoords = getCaretCoordinates(textareaRef.current, atIndex);
          
          const textareaRect = textareaRef.current.getBoundingClientRect();
          
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
  
  // Listen for clicks outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionOpen && textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mentionOpen]);
  
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
  const filteredUsers = safeUsers.filter(user => {
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
                  <AvatarFallback>{commentUser?.name?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{commentUser?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
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
          {mentionOpen && (
            <div className="relative z-50">
              <div 
                className="absolute z-50"
                style={{
                  top: 0,
                  left: 0,
                  transform: `translate(${mentionPosition.left}px, ${mentionPosition.top}px)`,
                }}
              >
                <div className="bg-white dark:bg-gray-800 border rounded-md shadow-md">
                  <div className="rounded-md overflow-hidden">
                    <div className="p-1 bg-popover text-popover-foreground">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {mentionQuery ? `Matching "${mentionQuery}"` : "Select a user"}
                      </div>
                      <div className="overflow-hidden max-h-[200px] overflow-y-auto">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
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
                          })
                        ) : (
                          <div className="px-2 py-1.5 text-sm">
                            No users found matching "{mentionQuery}"
                          </div>
                        )}
                      </div>
                    </div>
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
