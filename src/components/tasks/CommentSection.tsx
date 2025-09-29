
import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MentionDropdown } from "../messages/MentionDropdown";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Ensure we have valid users array
  const safeUsers = Array.isArray(users) ? users : [];
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const handleSubmitComment = async (e: React.FormEvent) => {
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
      
      if (mentionedUser && !mentionedUserIds.includes(mentionedUser.auth_user_id)) {
        mentionedUserIds.push(mentionedUser.auth_user_id);
      }
    });
    
    try {
      // Add the comment to the task
      const commentId = await addComment(taskId, currentUser.auth_user_id, comment, mentionedUserIds);
      
      // Create notification messages for each mentioned user and task assignee/collaborators
      if (task) {
      // For mentions
      for (const userId of mentionedUserIds) {
        if (userId !== currentUser.auth_user_id) {
          await createMessage({
            senderId: currentUser.auth_user_id,
            recipientIds: [userId],
            content: `You were mentioned in a comment on task "${task.title}"`,
            commentId: commentId,
            taskId: taskId,
            projectId: task.projectId
          });
        }
      }
      
      // For task assignee
      if (task.assigneeId && task.assigneeId !== currentUser.auth_user_id && !mentionedUserIds.includes(task.assigneeId)) {
        await createMessage({
          senderId: currentUser.auth_user_id,
          recipientIds: [task.assigneeId],
          content: `New comment on task "${task.title}" you're assigned to`,
          commentId: commentId,
          taskId: taskId,
          projectId: task.projectId
        });
      }
      
      // For collaborators
      if (task.collaboratorIds && task.collaboratorIds.length > 0) {
        for (const collaboratorId of task.collaboratorIds) {
          if (
            collaboratorId !== currentUser.auth_user_id &&
            collaboratorId !== task.assigneeId && 
            !mentionedUserIds.includes(collaboratorId)
          ) {
            await createMessage({
              senderId: currentUser.auth_user_id,
              recipientIds: [collaboratorId],
              content: `New comment on task "${task.title}" you're collaborating on`,
              commentId: commentId,
              taskId: taskId,
              projectId: task.projectId
            });
          }
        }
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
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to get first name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };
  
  // Calculate mention dropdown position
  const calculateMentionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    // Simple positioning - just below the textarea at the mention position
    return {
      top: 40, // Position below the textarea
      left: 0
    };
  };
  
  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setComment(text);
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
            setMentionStartPos(atIndex);
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
  
  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: { id: string; name: string }) => {
    if (!textareaRef.current) return;
    
    const text = comment;
    const beforeMention = text.substring(0, mentionStartPos);
    const afterMention = text.substring(cursorPosition);
    const newText = `${beforeMention}@${user.name} ${afterMention}`;
    
    setComment(newText);
    setMentionOpen(false);
    setMentionQuery("");
    
    // Focus back on textarea and set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStartPos + user.name.length + 2; // +2 for @ and space
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  };
  
  // Close mentions when clicking outside
  const handleBlur = () => {
    setTimeout(() => {
      setMentionOpen(false);
    }, 150);
  };
  
  // Filter users for mentions (exclude current user)
  const otherUsers = safeUsers.filter(user => user.auth_user_id !== currentUser?.auth_user_id);

  // Format comment content with mentions
  const formatCommentContent = (content: string, mentionedUserIds: string[] = []) => {
    let formattedContent = content;
    
    mentionedUserIds.forEach(userId => {
      const user = safeUsers.find(u => u.auth_user_id === userId);
      if (user) {
        const mentionRegex = new RegExp(`@${user.name}`, 'g');
        formattedContent = formattedContent.replace(
          mentionRegex,
          `<span class="bg-primary/20 text-primary px-1 rounded">@${user.name}</span>`
        );
      }
    });

    return formattedContent;
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>
      
      {/* Comments List */}
      <ScrollArea className="max-h-[400px] pr-4">
        <div className="space-y-4">
          {task.comments && task.comments.length > 0 ? (
            task.comments.map(comment => {
              const commentUser = users.find(u => u.auth_user_id === comment.userId);
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={commentUser?.avatar} />
                    <AvatarFallback>
                      {commentUser?.name?.substring(0, 2) || 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{commentUser?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: formatCommentContent(comment.content, comment.mentionedUserIds)
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No comments yet
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Comment Input Form - Always at the bottom */}
      {currentUser && (
        <form onSubmit={handleSubmitComment} className="space-y-2 relative">
          <div className="relative">
            <Textarea 
              ref={textareaRef}
              placeholder="Add a comment... (Use @ to mention users)" 
              value={comment}
              onChange={handleTextareaChange}
              onBlur={handleBlur}
              className="min-h-[80px]"
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
