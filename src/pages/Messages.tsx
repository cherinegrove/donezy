import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Message } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Messages() {
  const { messages, users, projects, tasks } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const getMessageContext = (message: Message) => {
    if (message.projectId) {
      const project = projects.find(p => p.id === message.projectId);
      return project ? `Project: ${project.name}` : 'Unknown Project';
    }
    
    if (message.taskId) {
      const task = tasks.find(t => t.id === message.taskId);
      return task ? `Task: ${task.title}` : 'Unknown Task';
    }
    
    return 'Direct Message';
  };

  return (
    <div className="flex h-screen">
      {/* Message List */}
      <div className="w-80 border-r p-4">
        <h2 className="text-lg font-semibold mb-4">Messages</h2>
        <Input type="search" placeholder="Search messages..." className="mb-4" />
        <div className="space-y-2">
          {messages.map(message => {
            const sender = users.find(user => user.id === message.senderId);
            return (
              <Button
                key={message.id}
                variant="ghost"
                className={`w-full justify-start ${selectedMessage?.id === message.id ? 'bg-secondary' : ''}`}
                onClick={() => setSelectedMessage(message)}
              >
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarImage src={sender?.avatar} />
                  <AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{sender?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{message.content}</p>
                </div>
                {!message.read && <Badge variant="secondary">New</Badge>}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 p-4">
        {selectedMessage ? (
          <div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold">
                {users.find(user => user.id === selectedMessage.senderId)?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getMessageContext(selectedMessage)}
              </p>
            </div>
            <div className="mb-6 p-4 border rounded-md">
              <p>{selectedMessage.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(selectedMessage.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <Input type="text" placeholder="Reply..." className="mb-2" />
              <Button>Send</Button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Select a message to view its content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
