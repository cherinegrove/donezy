
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface MessageViewProps {
  message: Message;
  onReply: () => void;
}

export function MessageView({ message, onReply }: MessageViewProps) {
  const { getUserById, users } = useAppContext();
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  
  const sender = getUserById(message.senderId);
  
  const recipients = message.recipientIds.map(id => 
    getUserById(id)?.name || "Unknown User"
  ).join(", ");
  
  const handleStartReply = () => {
    setIsReplying(true);
  };
  
  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };
  
  const handleSendReply = () => {
    if (replyContent.trim()) {
      onReply();
      setIsReplying(false);
      setReplyContent("");
    }
  };
  
  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">{message.subject}</h1>
        <div className="mt-3 flex justify-between items-start">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={sender?.avatar} />
              <AvatarFallback>
                {sender?.name.slice(0, 2) || 'UN'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-medium">{sender?.name || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground">To: {recipients}</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
      
      {isReplying ? (
        <div className="p-4 border-t space-y-3">
          <Textarea
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReply}>
              Cancel
            </Button>
            <Button onClick={handleSendReply}>
              Send Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t">
          <Button onClick={handleStartReply} className="w-full">
            Reply
          </Button>
        </div>
      )}
    </div>
  );
}
