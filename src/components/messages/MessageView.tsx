
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageHeader } from "./MessageHeader";
import { MessageReplyForm } from "./MessageReplyForm";
import { toast } from "@/components/ui/use-toast";

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
  
  const task = getTaskById(message.taskId);
  const project = task ? getProjectById(task.projectId) : null;
  const client = project ? getClientById(project.clientId) : null;
  const sender = getUserById(message.senderId);
  
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
  const mentionableUsers = users.filter(user => user.id !== currentUser?.id);
  
  return (
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
          
          {!isReplying ? (
            <div className="flex justify-end">
              <Button onClick={handleStartReply}>
                Reply
              </Button>
            </div>
          ) : (
            <MessageReplyForm
              onCancel={handleCancelReply}
              onSend={handleSendReply}
              users={mentionableUsers}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
