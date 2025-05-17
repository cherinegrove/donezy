
import React, { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { tasks, users, currentUser, addComment } = useAppContext();
  const [comment, setComment] = useState("");
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;
    
    addComment(taskId, currentUser.id, comment);
    setComment("");
  };
  
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
        <form onSubmit={handleSubmitComment} className="space-y-2">
          <Textarea 
            placeholder="Add a comment..." 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px]"
          />
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
