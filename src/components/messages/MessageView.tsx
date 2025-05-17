
import { useAppContext } from "@/contexts/AppContext";
import { Message, Comment } from "@/types";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageHeader } from "./MessageHeader";
import { MessageReplyForm } from "./MessageReplyForm";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageViewProps {
  message: Message;
  onReply: () => void;
}

export function MessageView({ message, onReply }: MessageViewProps) {
  const { 
    getUserById, 
    getClientById, 
    getProjectById, 
    getTaskById, 
    users, 
    currentUser,
    addComment
  } = useAppContext();
  
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  
  const task = getTaskById(message.taskId);
  const project = task ? getProjectById(task.projectId) : null;
  const client = project ? getClientById(project.clientId) : null;
  const sender = getUserById(message.senderId);
  
  // Get all comments from the task to show the thread
  useEffect(() => {
    if (task && task.comments) {
      setComments(task.comments);
    }
  }, [task]);
  
  const handleStartReply = () => {
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };
  
  const handleSendReply = () => {
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message",
        variant: "destructive",
      });
      return;
    }
    
    if (task && currentUser) {
      addComment(task.id, currentUser.id, replyContent);
      
      toast({
        title: "Reply sent",
        description: "Your reply has been added to the task",
      });
      
      setIsReplying(false);
      setReplyContent("");
      onReply();
    }
  };
  
  // Filter out the current user from the users list for mentions
  const mentionableUsers = users ? users.filter(user => user.id !== currentUser?.id) : [];
  
  return (
    <>
      <Card className="h-full">
        <MessageHeader 
          sender={sender}
          timestamp={message.timestamp}
          client={client}
          project={project}
          task={task}
          onCreateSubtask={() => console.log("Create subtask from message")}
          onCreateTask={() => console.log("Create task from message")}
        />
        
        <CardContent>
          <div className="space-y-6">
            <div className="text-lg">
              {message.content}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsThreadOpen(true)}>
                View Thread
              </Button>
              
              {!isReplying ? (
                <Button onClick={handleStartReply}>
                  Reply
                </Button>
              ) : null}
            </div>
            
            {isReplying && (
              <MessageReplyForm
                onCancel={handleCancelReply}
                onSend={handleSendReply}
                users={mentionableUsers || []}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isThreadOpen} onOpenChange={setIsThreadOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comment Thread</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {comments && comments.length > 0 ? (
                comments.map((comment) => {
                  const commentUser = getUserById(comment.userId);
                  
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={commentUser?.avatar} />
                        <AvatarFallback>
                          {commentUser?.name?.substring(0, 2) || 'UN'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{commentUser?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">No comments in this thread</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
