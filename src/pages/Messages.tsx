
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/messages/MessageList";
import { MessageView } from "@/components/messages/MessageView";
import { ComposeMessageDialog } from "@/components/messages/ComposeMessageDialog";
import { Message } from "@/types";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const Messages = () => {
  const { messages, currentUser, sendMessage } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { messageId } = useParams<{ messageId?: string }>();
  const navigate = useNavigate();
  
  // Filter messages to show only those that involve the current user
  const userMessages = messages.filter(
    (msg) => 
      msg.senderId === currentUser?.id || 
      msg.recipientIds.includes(currentUser?.id || "")
  ).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Handle message selection from URL
  if (messageId && !selectedMessage) {
    const msgFromUrl = messages.find(m => m.id === messageId);
    if (msgFromUrl) {
      setSelectedMessage(msgFromUrl);
    }
  }
  
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    navigate(`/messages/${message.id}`);
  };
  
  const handleReply = () => {
    if (!selectedMessage) return;
    
    // In a real app, this would add to a thread
    // Here we just send a new message
    sendMessage({
      senderId: currentUser?.id || "",
      recipientIds: [selectedMessage.senderId],
      subject: `Re: ${selectedMessage.subject}`,
      content: "This is a reply to your message.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Communicate with your team and clients
          </p>
        </div>
        <Button onClick={() => setIsComposeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <MessageList 
            messages={userMessages}
            onSelect={handleSelectMessage}
            selectedMessageId={selectedMessage?.id}
          />
        </div>
        
        <div className="md:col-span-2">
          {selectedMessage ? (
            <MessageView message={selectedMessage} onReply={handleReply} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border rounded-md">
              <p className="text-muted-foreground">Select a message or start a new conversation</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsComposeOpen(true)}
              >
                New Message
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <ComposeMessageDialog 
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
      />
    </div>
  );
};

export default Messages;
